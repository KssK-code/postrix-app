/**
 * Gestión de grupos: parseo de URLs, persistencia, búsqueda con Playwright.
 */
import { getStore } from '../config/settings.js';
import { writeLog } from '../utils/logger.js';
import {
  searchGroupsByKeyword,
  searchInMyGroups,
  launchVisibleBrowser,
  FB_ORIGIN,
  JOIN_GROUP_REGEX_SOURCE,
} from './facebook.js';

const MAX_GROUPS = 80;

/**
 * Tiempo máximo por grupo al verificar tipo; si se supera, se asume compatible (no bloquear).
 * Atado al wait interno de checkGroupType: ese espera ~5.5s tras el goto para que renderice el
 * botón "Unirte al grupo" (detección de no-membresía). Con goto lento, goto + 5.5s + evaluate se
 * acerca a 10s → caería a _timeout y la detección de membresía nunca correría. 15s deja margen.
 * NO bajar este timeout sin bajar también el sleep(5500) de checkGroupType (van juntos).
 */
const VERIFY_GROUP_TIMEOUT_MS = 15_000;

/** Páginas en paralelo para visitar grupos (balance velocidad / memoria). */
const VERIFY_CONCURRENCY = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Visita la página del grupo y detecta:
 *  - Si es solo compraventa o si hay compositor de publicación.
 *  - El estado de membresía: 'member' | 'pending' | 'not_member' | 'questions_required'.
 * En error de red o DOM, devuelve `{ unknown: true }` para que el caller no asuma compatible.
 *
 * @param {import('playwright').Page} page
 * @param {string} groupId
 * @returns {Promise<{ isMarketplaceOnly?: boolean, hasComposer?: boolean, membershipState?: 'member' | 'pending' | 'not_member' | 'questions_required', matchedPhrase?: string, unknown?: boolean, error?: string }>}
 */
export async function checkGroupType(page, groupId) {
  try {
    await page.goto(`${FB_ORIGIN}/groups/${groupId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    // ~5.5s (igual que el wait de publishInGroup): el botón "Unirte al grupo"
    // recién renderiza a ~5-8s; con 2s la detección estructural de no-membresía
    // nunca lo veía → falso 'member'. (23-jun-2026)
    await sleep(5500);

    const result = await page.evaluate((joinReSrc) => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], nav a'));
      const tabTexts = tabs.map((t) => (t.innerText || '').toLowerCase().trim());

      const hasConversation = tabTexts.some(
        (t) =>
          t.includes('conversación') ||
          t.includes('conversation') ||
          t.includes('discusión') ||
          t.includes('discussion') ||
          t.includes('publicaciones') ||
          t.includes('posts')
      );

      const hasMarketplace = tabTexts.some(
        (t) =>
          t.includes('compraventa') ||
          t.includes('marketplace') ||
          t.includes('buy and sell')
      );

      // Compositor por marcadores VIVOS (23-jun-2026): el compositor del feed es
      // div[role="button"] con texto "Escribe algo..." (los [aria-placeholder*=]
      // y [aria-label*="Crear una publicación"] murieron, igual que feed/LeftRail).
      // querySelector no soporta :has-text, así que se detecta por estructura
      // (contenteditable/textbox) o por el texto del botón compositor.
      const composerPhrases = [
        'escribe algo',
        'crea una publicación',
        'crear publicación',
        'write something',
        "what's on your mind",
      ];
      const hasComposer =
        !!document.querySelector('[contenteditable="true"], [role="textbox"]') ||
        [...document.querySelectorAll('div[role="button"], div[tabindex="0"], span[role="button"]')].some((el) => {
          const t = (el.innerText || '').toLowerCase();
          return composerPhrases.some((p) => t.includes(p));
        });

      // Membresía: mismo orden de precedencia que en publishInGroup
      const bodyText = (document.body.innerText || '').toLowerCase();
      const find = (phrases) => phrases.find((p) => bodyText.includes(p)) || null;

      const questionsMatch = find([
        'responder a las preguntas para unirte',
        'responder preguntas para unirte',
        'responde las preguntas para unirte',
        'responder preguntas',
        'responder las preguntas de membresía',
        'answer questions to join',
        'answer these questions to join',
        'answer membership questions',
        'answer questions',
      ]);

      const pendingMatch = find([
        'tu solicitud está pendiente',
        'your request is pending',
        'solicitud pendiente',
        'pending approval',
        'solicitud enviada',
        'request sent',
        'en espera de aprobación',
        'awaiting approval',
        'cancelar solicitud',
        'cancel request',
      ]);

      // NO-MEMBRESÍA — detección ESTRUCTURAL (ver JOIN_GROUP_REGEX_SOURCE en
      // facebook.js): botón de unirse por estructura (role=button/link) + regex
      // tolerante de copy. El 23-jun-2026 el copy "unirse"→"Unirte" rompió la
      // detección por frase exacta; no depender de texto exacto.
      const JOIN_RE = new RegExp(joinReSrc, 'i');
      const joinEl = [
        ...document.querySelectorAll('[role="button"], a[role="link"], a[href*="/groups/"], button'),
      ].find((el) => {
        const al = el.getAttribute('aria-label') || '';
        const t = (el.innerText || '').trim();
        return JOIN_RE.test(al) || JOIN_RE.test(t);
      });
      const notMemberMatch = joinEl
        ? (joinEl.getAttribute('aria-label') || joinEl.innerText || '').trim().slice(0, 80)
        : null;

      let membershipState = 'member';
      let matchedPhrase = null;
      if (questionsMatch) {
        membershipState = 'questions_required';
        matchedPhrase = questionsMatch;
      } else if (pendingMatch) {
        membershipState = 'pending';
        matchedPhrase = pendingMatch;
      } else if (notMemberMatch) {
        membershipState = 'not_member';
        matchedPhrase = notMemberMatch;
      }

      return {
        isMarketplaceOnly: hasMarketplace && !hasConversation,
        hasComposer,
        membershipState,
        matchedPhrase,
      };
    }, JOIN_GROUP_REGEX_SOURCE);

    return result;
  } catch (e) {
    writeLog('WARN', '[GroupManager] checkGroupType: error verificando grupo — unknown', {
      groupId,
      message: e.message,
    });
    return { unknown: true, error: e.message };
  }
}

/**
 * Extrae ID numérico de una URL de grupo de Facebook si existe en el path.
 */
export function extractGroupIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /facebook\.com\/groups\/(\d+)/i,
    /fb\.com\/groups\/(\d+)/i,
    /m\.facebook\.com\/groups\/(\d+)/i,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Detecta slug de grupo (nombre) en la URL.
 */
export function extractGroupSlugFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/facebook\.com\/groups\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  const part = decodeURIComponent(m[1]);
  if (/^\d+$/.test(part)) return null;
  return part;
}

/**
 * Parsea un bloque de texto con una URL por línea.
 */
export function parseUrlsFromText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ids = [];
  const needResolve = [];
  for (const line of lines) {
    const numId = extractGroupIdFromUrl(line);
    if (numId) {
      // Sin comprobar membresía en Facebook → pendiente hasta que se verifique en búsqueda
      ids.push({
        id: numId,
        url: line,
        name: `Grupo ${numId}`,
        status: 'active',
        membership: 'pending',
      });
    } else {
      const slug = extractGroupSlugFromUrl(line);
      if (slug) needResolve.push({ slug, url: line });
    }
  }
  return { ids, needResolve };
}

/**
 * Fusiona nuevos grupos con la lista guardada sin duplicar IDs.
 */
export function mergeGroups(existing, additions) {
  const map = new Map();
  for (const g of existing || []) {
    if (g?.id) {
      const cur = { ...g };
      if (cur.membership !== 'member' && cur.membership !== 'pending') {
        cur.membership = 'pending';
      }
      map.set(String(g.id), cur);
    }
  }
  for (const g of additions || []) {
    if (!g?.id) continue;
    const id = String(g.id);
    const incomingMember =
      g.membership === 'member' || g.membership === 'pending'
        ? g.membership
        : g.isMember === true
          ? 'member'
          : g.isMember === false
            ? null
            : null;

    if (!map.has(id)) {
      map.set(id, {
        id,
        name: g.name || `Grupo ${id}`,
        status: g.status || 'active',
        membership: incomingMember ?? g.membership ?? 'pending',
      });
    } else if (incomingMember === 'member') {
      const cur = map.get(id);
      map.set(id, {
        ...cur,
        membership: 'member',
        name: g.name || cur.name,
      });
    }
  }
  return Array.from(map.values()).slice(0, MAX_GROUPS);
}

/**
 * Guarda lista en store.
 */
export function saveGroups(list) {
  const store = getStore();
  store.set('groups', list.slice(0, MAX_GROUPS));
}

/**
 * Obtiene grupos desde store.
 */
export function loadGroups() {
  return getStore().get('groups') || [];
}

/**
 * Comprueba en paralelo si cada grupo es solo compraventa Y su estado de membresía
 * (al añadir desde el modal, no durante la búsqueda).
 *
 * @param {Array<{ id: string, name?: string }>} groups
 * @param {string} [accountId]
 * @returns {Promise<Array<{ id: string, name: string, groupType: 'compatible' | 'marketplace' | 'unknown', membershipState: 'member' | 'pending' | 'not_member' | 'questions_required' | 'unknown', matchedPhrase?: string }>>}
 */
export async function verifyMarketplaceForGroups(groups, accountId = 'default') {
  const list = (groups || []).filter((g) => g && g.id);
  if (!list.length) return [];

  const queue = [...list];
  const resultMap = new Map();
  let browser = null;

  try {
    const launched = await launchVisibleBrowser(accountId);
    browser = launched.browser;
    const { context } = launched;

    const worker = async () => {
      const page = await context.newPage();
      page.setDefaultTimeout(25_000);
      try {
        while (true) {
          const g = queue.shift();
          if (!g) break;
          const typed = await Promise.race([
            checkGroupType(page, g.id),
            sleep(VERIFY_GROUP_TIMEOUT_MS).then(() => ({ _timeout: true })),
          ]);

          let groupType;
          let membershipState = 'unknown';
          let matchedPhrase;
          if (!typed || typed._timeout) {
            writeLog('WARN', 'verifyMarketplaceForGroups: timeout verificando grupo', {
              groupId: g.id,
              timeoutMs: VERIFY_GROUP_TIMEOUT_MS,
            });
            groupType = 'unknown';
          } else if (typed.unknown) {
            // checkGroupType ya logueó el error
            groupType = 'unknown';
          } else {
            groupType = typed.isMarketplaceOnly === true ? 'marketplace' : 'compatible';
            membershipState = typed.membershipState || 'member';
            matchedPhrase = typed.matchedPhrase || undefined;
            if (membershipState !== 'member') {
              writeLog('WARN', 'verifyMarketplaceForGroups: grupo sin membresía activa', {
                groupId: g.id,
                membershipState,
                matchedPhrase,
              });
            }
          }

          resultMap.set(String(g.id), {
            id: g.id,
            name: g.name || `Grupo ${g.id}`,
            groupType,
            membershipState,
            ...(matchedPhrase ? { matchedPhrase } : {}),
          });
        }
      } finally {
        await page.close().catch(() => {});
      }
    };

    await Promise.all(Array.from({ length: VERIFY_CONCURRENCY }, () => worker()));
  } catch (err) {
    writeLog('ERROR', 'verifyMarketplaceForGroups: fallo del browser/contexto', { message: err.message });
    // Caída global: lo que no esté ya en resultMap se marca como unknown
    for (const g of list) {
      if (!resultMap.has(String(g.id))) {
        resultMap.set(String(g.id), {
          id: g.id,
          name: g.name || `Grupo ${g.id}`,
          groupType: 'unknown',
          membershipState: 'unknown',
        });
      }
    }
  } finally {
    await browser?.close().catch(() => {});
  }

  return list.map((g) => resultMap.get(String(g.id)) || {
    id: g.id,
    name: g.name || `Grupo ${g.id}`,
    groupType: 'unknown',
    membershipState: 'unknown',
  });
}

/**
 * Busca grupos: primero en "Tus grupos"; si no hay resultados, fallback a búsqueda global.
 * No visita cada grupo: la verificación marketplace ocurre al pulsar «Añadir seleccionados».
 *
 * @param {string} keyword
 * @param {{ accountId?: string, onProgress?: (p: { groups: object[] }) => void }} [options]
 */
export async function searchGroups(keyword, options = {}) {
  const { accountId = 'default', onProgress } = options;
  let raw = [];
  let browser = null;

  try {
    const launched = await launchVisibleBrowser(accountId);
    browser = launched.browser;
    const page = await launched.context.newPage();
    raw = await searchInMyGroups(page, keyword);
    await page.close().catch(() => {});
    await browser.close();
    browser = null;
  } catch (err) {
    writeLog('ERROR', 'searchGroups: navegación Tus grupos', { message: err.message });
    await browser?.close().catch(() => {});
    browser = null;
    raw = [];
  }

  if (!raw.length) {
    console.log('[GroupSearch] Sin resultados en Tus grupos — fallback búsqueda global (/search/groups/)');
    writeLog('INFO', 'searchGroups: fallback searchGroupsByKeyword');
    raw = await searchGroupsByKeyword(keyword, { accountId });
  }

  console.log('[GroupSearch] Grupos tras scrape (Tus grupos o fallback):', raw.length);
  raw.slice(0, 3).forEach((g) => {
    console.log('[GroupSearch] Grupo:', g.name, '| Miembro:', g.isMember);
  });

  const done = raw.map((g) => ({
    ...g,
    groupType: g.isMember ? 'compatible' : 'nonmember',
  }));
  onProgress?.({ groups: done });
  return done;
}
