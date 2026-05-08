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
} from './facebook.js';

const MAX_GROUPS = 80;

/** Tiempo máximo por grupo al verificar tipo; si se supera, se asume compatible (no bloquear). */
const VERIFY_GROUP_TIMEOUT_MS = 10_000;

/** Páginas en paralelo para visitar grupos (balance velocidad / memoria). */
const VERIFY_CONCURRENCY = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Visita la página del grupo y detecta si es solo compraventa o si hay compositor de publicación.
 * En error de red o DOM, devuelve `{ unknown: true }` para que el caller no asuma compatible.
 *
 * @param {import('playwright').Page} page
 * @param {string} groupId
 * @returns {Promise<{ isMarketplaceOnly?: boolean, hasComposer?: boolean, unknown?: boolean, error?: string }>}
 */
export async function checkGroupType(page, groupId) {
  try {
    await page.goto(`${FB_ORIGIN}/groups/${groupId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await sleep(2000);

    const result = await page.evaluate(() => {
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

      const hasComposer = !!document.querySelector(
        '[aria-placeholder*="Escribe"],' +
          '[aria-placeholder*="Write"],' +
          '[aria-label*="Crear una publicación"],' +
          '[aria-label*="Create a post"]'
      );

      return {
        isMarketplaceOnly: hasMarketplace && !hasConversation,
        hasComposer,
      };
    });

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
 * Comprueba en paralelo si cada grupo es solo compraventa (al añadir desde el modal, no durante la búsqueda).
 *
 * @param {Array<{ id: string, name?: string }>} groups
 * @param {string} [accountId]
 * @returns {Promise<Array<{ id: string, name: string, groupType: 'compatible' | 'marketplace' }>>}
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
          if (!typed || typed._timeout) {
            writeLog('WARN', 'verifyMarketplaceForGroups: timeout verificando grupo', {
              groupId: g.id,
              timeoutMs: VERIFY_GROUP_TIMEOUT_MS,
            });
            groupType = 'unknown';
          } else if (typed.unknown) {
            // checkGroupType ya logueó el error
            groupType = 'unknown';
          } else if (typed.isMarketplaceOnly === true) {
            groupType = 'marketplace';
          } else {
            groupType = 'compatible';
          }

          resultMap.set(String(g.id), {
            id: g.id,
            name: g.name || `Grupo ${g.id}`,
            groupType,
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
