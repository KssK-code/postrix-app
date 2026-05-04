/**
 * Automatización de Facebook con Playwright.
 * Login: navegador visible. Publicaciones: navegador visible en ventana lateral (ver publishToGroup).
 * Excepción: refresh del nombre desde cookies usa Chromium headless (solo lectura, sin login).
 * Los selectores de Facebook cambian con frecuencia — revisar si falla.
 */
import { app } from 'electron';
import { chromium } from 'playwright';
import path from 'path';
import { writeLog } from '../utils/logger.js';
import { getStore } from '../config/settings.js';
import { existsSync, readdirSync } from 'fs';

/**
 * En el .exe empaquetado, pasamos executablePath directo a chromium.launch().
 * NO usamos PLAYWRIGHT_BROWSERS_PATH: Playwright lo cachea al cargar el módulo
 * (top-level IIFE en su registry), antes de que el cuerpo de este módulo corra.
 * Por eso v1.0.1 falló: setear el env var después de `import { chromium }` era inútil.
 */
function getBundledChromiumExec() {
  if (!app?.isPackaged) return undefined;
  const baseDir = path.join(process.resourcesPath, 'ms-playwright');
  if (!existsSync(baseDir)) return undefined;
  const chromiumDir = readdirSync(baseDir).find((d) => /^chromium-\d+$/.test(d));
  if (!chromiumDir) return undefined;
  const exe = path.join(baseDir, chromiumDir, 'chrome-win64', 'chrome.exe');
  return existsSync(exe) ? exe : undefined;
}
export const BUNDLED_CHROME = getBundledChromiumExec();

export const FB_ORIGIN = 'https://www.facebook.com';

/**
 * Todas las aperturas de Chromium en este módulo: siempre visibles (nunca headless: true).
 */
function getChromiumVisibleLaunchOptions() {
  return {
    headless: false,
    slowMo: 80,
    args: [
      '--window-size=480,780',
      '--window-position=750,50',
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled',
    ],
    ...(BUNDLED_CHROME ? { executablePath: BUNDLED_CHROME } : {}),
  };
}

/** Chromium para conexión/login manual: ventana escritorio y flags que imitan uso humano. */
function getChromiumConnectLaunchOptions() {
  return {
    headless: false,
    slowMo: 50,
    args: [
      '--window-size=1280,800',
      '--window-position=100,50',
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    ...(BUNDLED_CHROME ? { executablePath: BUNDLED_CHROME } : {}),
  };
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Espera aleatoria entre min y max ms (inclusive). Siempre usar rangos, nunca un único valor fijo.
 */
export async function randomDelay(min, max) {
  const ms = min + Math.floor(Math.random() * (max - min + 1));
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Mueve el puntero hacia (x, y) con varios pasos para simular trayectoria humana.
 */
export async function humanMouseMove(page, x, y) {
  const steps = randomBetween(8, 15);
  await page.mouse.move(x, y, { steps });
}

/**
 * Comprueba el HTML visible por mensajes típicos de bloqueo o error de Facebook (ES/EN).
 * @returns {null | { success: false, reason: string, detail?: string }}
 */
/**
 * Detección estricta de bloqueos (evita falsos positivos por la palabra "captcha" en scripts/HTML).
 * @returns {Promise<'captcha' | 'no_permission' | 'group_not_found' | null>}
 */
async function detectFacebookBlockingUI(page) {
  try {
    const html = await page.content();
    const lower = html.toLowerCase();

    // Solo captcha real — elementos muy específicos
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '#captcha',
      '[data-testid="captcha"]',
    ];
    for (const sel of captchaSelectors) {
      const el = await page.$(sel);
      if (el) return 'captcha';
    }

    // Checkpoint de Facebook o sesión inválida
    const u = page.url();
    if (u.includes('/checkpoint/') || u.includes('/login/')) {
      return 'captcha';
    }

    // Sin permiso para publicar
    if (
      lower.includes('no tienes permiso para publicar') ||
      lower.includes("you don't have permission to post")
    ) {
      return 'no_permission';
    }

    // Grupo / contenido no disponible
    if (lower.includes('este contenido no está disponible') && lower.includes('grupo')) {
      return 'group_not_found';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Inserta el texto vía portapapeles (más rápido y natural que tecla a tecla).
 * Si el API de clipboard falla, usa insertText en el elemento con foco.
 */
async function humanTypeText(page, text) {
  if (!text) return;
  console.log('[FB] Escribiendo texto via clipboard...');

  let clipboardOk = false;
  try {
    clipboardOk = await page.evaluate(async (t) => {
      try {
        await navigator.clipboard.writeText(t);
        return true;
      } catch {
        return false;
      }
    }, text);
  } catch {
    clipboardOk = false;
  }

  await randomDelay(300, 600);

  if (clipboardOk) {
    await page.keyboard.press('Control+v');
    await randomDelay(500, 1000);
    console.log('[FB] ✅ Texto pegado via clipboard');
    return;
  }

  // Fallback: portapapeles no disponible o bloqueado por el contexto de la página
  console.log('[FB] Clipboard no disponible, usando insertText en el foco...');
  await page.evaluate((t) => {
    const el = document.activeElement;
    if (el) {
      document.execCommand('insertText', false, t);
    }
  }, text);
  await randomDelay(500, 1000);
}

/**
 * Abre el compositor de publicación con varios fallbacks (selectores, texto visible, área superior, coordenadas).
 */
async function tryClickComposer(page) {
  // MÉTODO 1 — Selectores directos conocidos
  const directSelectors = [
    'div[role="button"]:has-text("Escribe algo")',
    'div[role="button"]:has-text("Write something")',
    '[aria-label="Crear una publicación"]',
    '[aria-label="Create a post"]',
    '[aria-placeholder="Escribe algo..."]',
    '[aria-placeholder="Write something..."]',
    '[aria-placeholder="¿Qué estás pensando?"]',
    '[data-testid="status-attachment-mentions-input"]',
  ];

  for (const sel of directSelectors) {
    try {
      const el = await page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await el.click();
        await randomDelay(3000, 4000);
        console.log('[FB] ✅ Compositor encontrado método 1:', sel);
        return true;
      }
    } catch {
      /* siguiente selector */
    }
  }

  // MÉTODO 2 — Buscar por texto visible en la página
  try {
    const found = await page.evaluate(() => {
      const textos = [
        'Escribe algo',
        'Write something',
        'Crear publicación',
        'Create post',
        '¿Qué estás pensando',
        "What's on your mind",
      ];
      const allElements = document.querySelectorAll(
        'div[role="button"], div[contenteditable], span[role="button"], div[tabindex="0"]'
      );
      for (const el of allElements) {
        const text = el.innerText || el.textContent || '';
        const placeholder =
          el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || '';
        if (textos.some((t) => text.includes(t) || placeholder.includes(t))) {
          el.click();
          return true;
        }
      }
      return false;
    });
    if (found) {
      await randomDelay(3000, 4000);
      console.log('[FB] ✅ Compositor encontrado método 2 (texto)');
      return true;
    }
  } catch {
    /* continuar con método 3 */
  }

  // MÉTODO 3 — Click en área superior del feed (el compositor suele estar arriba)
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(1000, 1500);

    const method3Debug = await page.evaluate(() => {
      const rect = { top: 0, bottom: 400 };
      const elements = document.querySelectorAll('div[role="button"], div[tabindex="0"]');
      for (const el of elements) {
        const bounds = el.getBoundingClientRect();
        if (
          bounds.top >= rect.top &&
          bounds.top <= rect.bottom &&
          bounds.width > 200
        ) {
          el.click();
          return {
            ok: true,
            tagName: el.tagName,
            ariaLabel: el.getAttribute('aria-label') || '',
            role: el.getAttribute('role') || '',
            textPreview: (el.innerText || '').slice(0, 120).replace(/\s+/g, ' ').trim(),
            width: Math.round(bounds.width),
            top: Math.round(bounds.top),
          };
        }
      }
      return null;
    });
    if (method3Debug && method3Debug.ok) {
      await page
        .screenshot({ path: path.join(process.cwd(), 'debug-method3-click.png') })
        .catch(() => {});
      console.log('[FB] Screenshot método 3 guardado: debug-method3-click.png');
      console.log('[FB] ✅ Compositor método 3 (debug):', JSON.stringify(method3Debug));
      await randomDelay(3000, 4000);
      return true;
    }
  } catch {
    /* continuar con método 4 */
  }

  // MÉTODO 4 — Click en coordenadas típicas del compositor (viewport estrecho)
  try {
    const viewport = page.viewportSize();
    const centerX = viewport ? viewport.width / 2 : 400;
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(1000, 1500);
    await page.mouse.click(centerX, 350);
    await randomDelay(3000, 4000);
    const modal = await page.$('div[role="dialog"]');
    if (modal) {
      console.log('[FB] ✅ Compositor encontrado método 4 (coordenadas)');
      return true;
    }
  } catch {
    /* ningún método */
  }

  console.log('[FB] ❌ Compositor no encontrado con ningún método');
  return false;
}

/**
 * Clic en el ícono de foto de la barra "Añadir a tu publicación" del modal, luego setInputFiles y comprobación de preview.
 * @returns {Promise<boolean>} true si el preview se confirmó (archivo enviado y procesado según selectores)
 */
export async function attachImageHuman(page, imagePath) {
  console.log('[FB] Adjuntando imagen:', imagePath);
  await randomDelay(1000, 1500);

  try {
    /** Barra del modal: etiquetas ES/EN y coincidencia parcial "oto" (Foto/Photo) */
    const photoIconSelectors = [
      'div[role="dialog"] [aria-label="Foto/vídeo"]',
      'div[role="dialog"] [aria-label="Foto/video"]',
      'div[role="dialog"] [aria-label="Fotos/vídeos"]',
      'div[role="dialog"] [aria-label="Photo/video"]',
      'div[role="dialog"] [aria-label="Photos/videos"]',
      'div[role="dialog"] div[aria-label*="oto"]',
      'div[aria-label="Añadir a tu publicación"] [role="button"]:first-child',
      'div[aria-label="Add to your post"] [role="button"]:first-child',
    ];

    let iconClicked = false;
    for (const sel of photoIconSelectors) {
      try {
        // El modal a veces tarda: más margen para que aparezca la barra de foto
        const photoButton = await page.waitForSelector(sel, { state: 'visible', timeout: 10_000 });
        if (photoButton) {
          console.log('[FB] Botón foto encontrado:', sel);
          await photoButton.click();
          iconClicked = true;
          break;
        }
      } catch {
        /* siguiente selector */
      }
    }

    /** Si no hubo match por aria-label: primer control clickeable en la barra "Añadir…" / "Add to your post" */
    if (!iconClicked) {
      console.log('[FB] Buscando ícono foto por posición...');
      iconClicked = await page.evaluate(() => {
        const bars = Array.from(document.querySelectorAll('div[aria-label], div[role="toolbar"]'));
        const bar = bars.find((b) => {
          const label = (b.getAttribute('aria-label') || '').toLowerCase();
          return (
            label.includes('añadir') || label.includes('add to your') || label.includes('agregar')
          );
        });
        if (!bar) return false;
        const btn = bar.querySelector('[role="button"]') || bar.querySelector('div[tabindex]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
    }

    /** Sin ícono: intentar el input file oculto del modal (Facebook a veces no muestra el botón) */
    let directFileUpload = false;
    if (!iconClicked) {
      const fileInputDirect = await page.$('div[role="dialog"] input[type="file"]');
      if (fileInputDirect) {
        await fileInputDirect.setInputFiles(imagePath);
        directFileUpload = true;
        console.log('[FB] ✅ Archivo enviado por input[type=file] directo (sin clic en foto)');
      } else {
        console.log('[FB] ❌ No se pudo encontrar botón de foto ni input file en el modal');
        return false;
      }
    }

    if (!directFileUpload) {
      console.log('[FB] ✅ Click en ícono foto');
      await randomDelay(1500, 2500);

      /** Los input file suelen estar ocultos; basta con attached */
      const fileLoc = page.locator('div[role="dialog"] input[type="file"]').first();
      await fileLoc.waitFor({ state: 'attached', timeout: 8000 });
      await fileLoc.setInputFiles(imagePath);
      console.log('[FB] ✅ Archivo seleccionado');
    } else {
      await randomDelay(1500, 2500);
    }

    await randomDelay(4000, 6000);

    let previewFound = false;
    for (let i = 0; i < 8; i++) {
      const preview = await page.$(
        'img[src*="blob:"], ' + '[aria-label="Editar foto"], ' + '[aria-label="Edit photo"]'
      );
      if (preview) {
        console.log('[FB] ✅ Preview confirmado en intento', i + 1);
        previewFound = true;
        break;
      }
      await randomDelay(1000, 1500);
    }

    if (!previewFound) {
      const shot = path.join(process.cwd(), 'debug-image-upload.png');
      await page.screenshot({ path: shot }).catch(() => {});
      console.log('[FB] ⚠️ Preview no confirmado - screenshot guardado:', shot);
    }

    await randomDelay(2000, 3000);
    return previewFound;
  } catch (err) {
    console.log('[FB] ❌ Error en attachImageHuman:', err.message);
    return false;
  }
}

/**
 * Guarda cookies serializadas para una cuenta.
 */
export function saveCookiesForAccount(accountId, cookies) {
  const store = getStore();
  const accounts = store.get('facebookAccounts') || [];
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx >= 0) {
    accounts[idx].cookies = JSON.stringify(cookies);
    store.set('facebookAccounts', accounts);
  }
}

/**
 * Carga cookies: prioridad fb_session_cookies, luego cuenta en facebookAccounts.
 */
export function loadCookiesForAccount(accountId) {
  const store = getStore();
  const rawGlobal = store.get('fb_session_cookies');
  if (rawGlobal && typeof rawGlobal === 'string' && rawGlobal.length > 2) {
    try {
      const parsed = JSON.parse(rawGlobal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* continuar */
    }
  }
  const acc = (store.get('facebookAccounts') || []).find((a) => a.id === accountId);
  if (!acc?.cookies) return null;
  try {
    return JSON.parse(acc.cookies);
  } catch {
    return null;
  }
}

/**
 * Quita prefijos que Facebook añade en aria-label / títulos (p. ej. «Biografía de …»).
 */
function cleanFacebookName(name) {
  if (!name) return null;

  const prefixesToRemove = [
    'Biografía de ',
    'Biography of ',
    'Profile of ',
    'Perfil de ',
    'Ver el perfil de ',
    'See profile of ',
  ];

  let cleaned = String(name).trim();
  for (const prefix of prefixesToRemove) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.replace(prefix, '').trim();
    }
  }

  return cleaned.length > 1 ? cleaned : null;
}

/** Indica si el texto es un nombre aceptable (post-limpieza). */
function isPlausibleDisplayName(text) {
  if (!text || text.length <= 1) return false;
  return (
    text !== 'Facebook' &&
    text !== 'Chats' &&
    text !== 'Iniciar sesión' &&
    text !== 'Log in' &&
    text !== 'Mi cuenta Facebook'
  );
}

/**
 * Nombre visible sin depender de /me (allí el H1 suele ser «Chats»).
 * Home → aria-label / menú cuenta / rail izquierdo → opcional ajustes de cuenta.
 */
async function getFacebookUserName(page) {
  try {
    console.log('[FB Login] Obteniendo nombre real...');

    await page.goto(`${FB_ORIGIN}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await sleep(2000);

    const name = await page.evaluate(() => {
      // Estrategia 1: enlaces con aria-label hacia perfil (menú lateral)
      const profileLinks = document.querySelectorAll(
        'a[href*="/profile.php"], a[href*="facebook.com/"][aria-label]'
      );
      for (const link of profileLinks) {
        const label = link.getAttribute('aria-label') || '';
        if (
          label &&
          !label.includes('Facebook') &&
          !label.includes('Inicio') &&
          !label.includes('Home') &&
          !label.includes('Grupos') &&
          !label.includes('Groups') &&
          !label.includes('Marketplace') &&
          !label.includes('Reels') &&
          !label.includes('Watch') &&
          !label.includes('Gaming') &&
          label.length > 1 &&
          label.length < 60
        ) {
          return label.trim();
        }
      }

      // Estrategia 2: menú de cuenta (esquina superior derecha)
      const accountButton = document.querySelector(
        '[aria-label*="Cuenta"], [aria-label*="Account"], ' +
          '[data-testid="blue_bar_profile_link"]'
      );
      if (accountButton) {
        const label = accountButton.getAttribute('aria-label') || '';
        const spans = accountButton.querySelectorAll('span');
        for (const span of spans) {
          const text = span.innerText?.trim();
          if (
            text &&
            text.length > 1 &&
            text.length < 60 &&
            ![
              'Facebook',
              'Inicio',
              'Home',
              'Grupos',
              'Groups',
              'Marketplace',
              'Reels',
              'Watch',
            ].includes(text)
          ) {
            return text;
          }
        }
        // Si solo hay aria-label con el nombre (sin spans útiles)
        if (
          label &&
          label.length > 1 &&
          label.length < 60 &&
          !label.includes('Facebook') &&
          !label.includes('Cuenta de') &&
          !label.includes('Account')
        ) {
          const strip = label.replace(/\s*[·•]\s*.*/s, '').trim();
          if (strip.length > 1) return strip;
        }
      }

      // Estrategia 3: panel izquierdo — enlaces con texto corto
      const leftPanel = document.querySelector(
        '[data-pagelet="LeftRail"], [role="complementary"]'
      );
      if (leftPanel) {
        const links = leftPanel.querySelectorAll('a[href*="facebook.com/"]');
        for (const link of links) {
          const text = link.innerText?.trim();
          if (
            text &&
            text.length > 1 &&
            text.length < 50 &&
            !text.includes('Ver más') &&
            !text.includes('See more') &&
            !text.includes('Facebook') &&
            !text.match(/^\d+$/)
          ) {
            return text;
          }
        }
      }

      return null;
    });

    console.log('[FB Login] Nombre encontrado (crudo):', name);

    const cleanedName = cleanFacebookName(name);
    if (cleanedName && isPlausibleDisplayName(cleanedName)) {
      return cleanedName;
    }

    // Último recurso: configuración de cuenta
    try {
      await page.goto(`${FB_ORIGIN}/settings?tab=account`, {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      });
      await sleep(2000);

      const nameFromSettings = await page.evaluate(() => {
        const h1 = document.querySelector('h1, h2');
        return h1?.innerText?.trim() || null;
      });

      const cleanedSettings = cleanFacebookName(nameFromSettings);
      if (cleanedSettings && isPlausibleDisplayName(cleanedSettings)) {
        return cleanedSettings;
      }
    } catch {
      /* página de ajustes no cargó */
    }

    return 'Mi cuenta Facebook';
  } catch (e) {
    console.log('[FB Login] Error:', e.message);
    return 'Mi cuenta Facebook';
  }
}

/**
 * Relee el nombre con la sesión ya guardada (headless, sin pantalla de login).
 */
export async function refreshFacebookDisplayName() {
  const store = getStore();
  const raw = store.get('fb_session_cookies');
  if (!raw || typeof raw !== 'string' || raw.length < 10) {
    return { ok: false, error: 'no_cookies' };
  }

  let cookieData;
  try {
    cookieData = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_cookies' };
  }
  if (!Array.isArray(cookieData) || cookieData.length === 0) {
    return { ok: false, error: 'no_cookies' };
  }

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(BUNDLED_CHROME ? { executablePath: BUNDLED_CHROME } : {}),
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City',
    });
    await context.addCookies(cookieData);
    const page = await context.newPage();
    const name = await getFacebookUserName(page);

    await browser.close();
    browser = null;

    if (name && name !== 'Mi cuenta Facebook' && isPlausibleDisplayName(name)) {
      store.set('fb_user_name', name);
      const accountId = store.get('activeAccountId') || 'default';
      const accounts = [...(store.get('facebookAccounts') || [])];
      const idx = accounts.findIndex((a) => a.id === accountId);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], name };
        store.set('facebookAccounts', accounts);
      }
      writeLog('INFO', `[FB] Nombre actualizado desde cookies: ${name}`);
      return { ok: true, name };
    }
    return { ok: false, error: 'name_not_found' };
  } catch (e) {
    writeLog('ERROR', 'refreshFacebookDisplayName', { message: e.message });
    return { ok: false, error: e.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Abre Facebook visible: login manual hasta 5 min; guarda cookies y nombre en el store.
 */
export async function connectFacebookVisible(accountId = 'default') {
  let browser = null;
  // Tiempo máximo para que el usuario complete el login a mano (evita cierre prematuro)
  const LOGIN_WAIT_MS = 300_000; // 5 minutos — coincide con waitForFunction timeout

  writeLog('INFO', '[FB] Chromium bundle detection', {
    isPackaged: app?.isPackaged,
    bundledChrome: BUNDLED_CHROME || '(none — usará default Playwright path)',
  });

  console.log('[FB Login] Abriendo navegador...');
  writeLog('INFO', '[FB Login] Abriendo navegador...');

  try {
    browser = await chromium.launch(getChromiumConnectLaunchOptions());

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City',
    });

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: FB_ORIGIN,
      });
    } catch {
      /* opcional */
    }

    // Playwright usa ~30s por defecto en acciones sin timeout; NO usar page.setDefaultTimeout aquí (requisito del flujo)
    context.setDefaultTimeout(LOGIN_WAIT_MS);

    const page = await context.newPage();

    console.log('[FB Login] Navegando a Facebook...');
    writeLog('INFO', '[FB Login] Navegando a Facebook...');
    await page.goto(`${FB_ORIGIN}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });

    console.log('[FB Login] Esperando login manual (5 minutos)...');
    writeLog('INFO', '[FB Login] Esperando login manual (5 minutos)...');

    try {
      await page.waitForFunction(
        () => {
          const url = window.location.href.toLowerCase();
          if (!url.includes('facebook.com')) return false;

          // Solo éxito si ya salimos de login/checkpoint y hay señales de home (feed o barra)
          const notLogin =
            !url.includes('/login') &&
            !url.includes('/checkpoint') &&
            !url.includes('login.php');
          const hasFeed = !!document.querySelector(
            '[role="feed"], [aria-label="Facebook"]'
          );
          return notLogin && hasFeed;
        },
        { timeout: LOGIN_WAIT_MS } // 300000 ms = 5 minutos
      );
    } catch (waitErr) {
      console.log('[FB Login] Timeout o error:', waitErr.message);
      writeLog('ERROR', '[FB Login] Timeout o error', { message: waitErr.message });
      await browser.close().catch(() => {});
      browser = null;
      return { success: false, error: 'login_timeout' };
    }

    console.log('[FB Login] Sesión detectada (login completado, feed o navbar visible)');
    writeLog('INFO', '[FB Login] Login detectado exitosamente');

    await sleep(2000);

    const cookies = await context.cookies();
    const cookiesJson = JSON.stringify(cookies);

    let userName = await getFacebookUserName(page);
    if (userName === 'Iniciar sesión' || userName === 'Log in') {
      userName = 'Mi cuenta Facebook';
    }

    const store = getStore();
    store.set('fb_session_cookies', cookiesJson);
    store.set('fb_user_name', userName);

    const accounts = store.get('facebookAccounts') || [];
    const entry = {
      id: accountId,
      name: userName,
      photo: '',
      cookies: cookiesJson,
    };
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx >= 0) accounts[idx] = entry;
    else accounts.push(entry);
    store.set('facebookAccounts', accounts);
    store.set('activeAccountId', accountId);
    saveCookiesForAccount(accountId, cookies);

    console.log('[FB] Cookies guardadas. Usuario:', userName);
    writeLog('INFO', `[FB] Cookies guardadas. Usuario: ${userName}`);

    await browser.close();
    browser = null;

    return { success: true, name: userName, photo: '' };
  } catch (err) {
    console.log('[FB] Error:', err.message);
    writeLog('ERROR', 'connectFacebookVisible', { message: err.message });
    if (browser) await browser.close().catch(() => {});
    return { success: false, error: err.message || 'unknown' };
  }
}

/**
 * Cierra sesión local: borra cookies guardadas y cuentas.
 */
export function disconnectFacebook() {
  const store = getStore();
  store.delete('fb_session_cookies');
  store.delete('fb_user_name');
  store.delete('facebookAccounts');
  store.delete('activeAccountId');
  writeLog('INFO', 'Facebook desconectado (store limpiado con delete)');
  return { success: true, ok: true };
}

/**
 * Resuelve ID numérico navegando a un grupo por slug (URL con nombre).
 */
export async function resolveGroupIdFromSlug(slug, accountId = 'default') {
  const { browser, context } = await launchVisibleBrowser(accountId);
  const page = await context.newPage();
  try {
    const url = `${FB_ORIGIN}/groups/${encodeURIComponent(slug)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);
    const finalUrl = page.url();
    const m = finalUrl.match(/groups\/(\d+)/);
    await browser.close();
    return m ? m[1] : null;
  } catch (err) {
    writeLog('ERROR', 'resolveGroupIdFromSlug', { slug, message: err.message });
    await browser.close().catch(() => {});
    return null;
  }
}

/**
 * Chromium visible: ventana a la derecha, tamaño tipo móvil.
 * Usado en publicación, búsqueda de grupos y resolución de IDs.
 */
export async function launchVisibleBrowser(accountId = 'default') {
  const browser = await chromium.launch(getChromiumVisibleLaunchOptions());
  const context = await browser.newContext({
    viewport: { width: 480, height: 780 },
    locale: 'es-ES',
  });
  const cookies = loadCookiesForAccount(accountId);
  if (cookies?.length) await context.addCookies(cookies);
  // Necesario para humanTypeText (clipboard) en facebook.com
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: FB_ORIGIN });
  return { browser, context };
}

/**
 * Publicación en grupo con simulación humana (scroll, ratón, escritura, adjuntos, confirmación).
 * Requiere `page` de un contexto ya autenticado (cookies).
 *
 * @param {import('playwright').Page} page
 * @param {string} groupId
 * @param {{ text?: string, imagePath?: string }} content
 * @returns {Promise<
 *   | { success: true, groupId: string, imageAttached?: boolean }
 *   | { success: false, reason: string, detail?: string, pauseBot?: boolean }
 * >}
 */
export async function publishInGroup(page, groupId, content) {
  const { text, imagePath } = content || {};
  /** Indica si hubo ruta de imagen y el resultado de attachImageHuman (solo en éxito) */
  let imageAttached;
  const groupUrl = `${FB_ORIGIN}/groups/${groupId}`;
  const fail = (reason, detail) =>
    detail !== undefined
      ? { success: false, reason, detail }
      : { success: false, reason };

  // Mismo límite que en publishToGroup (2 min; grupos lentos o UI extra)
  page.setDefaultTimeout(120_000);

  /** PASO 1 — Entrar al grupo como humano */
  try {
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (e) {
    return fail('error', e.message);
  }

  // Más tiempo tras cargar el grupo: el compositor a veces aparece tarde
  await randomDelay(4000, 6000);

  // Grupo solo Compraventa / marketplace sin pestaña de conversación → no hay compositor de publicación normal
  const marketplaceDetect = await page.evaluate(() => {
    const tabs = Array.from(
      document.querySelectorAll('[role="tab"], nav a, [role="navigation"] a')
    );
    const tabTexts = tabs.map((t) => (t.innerText || '').toLowerCase());

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

    const sellEl = document.querySelector('[aria-label*="Vender"], [aria-label*="Sell"]');
    const composerPh = document.querySelector(
      '[aria-placeholder*="Escribe"], [aria-placeholder*="Write"]'
    );
    const hasSellOnly = !!sellEl && !composerPh;

    return {
      hasConversation,
      hasMarketplace,
      hasSellOnly,
      isMarketplaceOnly: hasMarketplace && !hasConversation,
    };
  });

  console.log('[FB] Detección grupo:', JSON.stringify(marketplaceDetect));

  if (marketplaceDetect.isMarketplaceOnly) {
    console.log('[FB] ⚠️ Grupo marketplace puro — no se puede publicar como feed normal');
    return fail('marketplace_only_group');
  }

  // Solicitud de ingreso pendiente: no intentar abrir compositor (evita timeout confuso)
  const pendingApproval = await page.evaluate(() => {
    const bodyText = (document.body.innerText || '').toLowerCase();
    return (
      bodyText.includes('solicitud pendiente') ||
      bodyText.includes('pending approval') ||
      bodyText.includes('solicitud enviada') ||
      bodyText.includes('request sent') ||
      bodyText.includes('en espera de aprobación') ||
      bodyText.includes('awaiting approval')
    );
  });

  if (pendingApproval) {
    console.log('[FB] ⚠️ Grupo con solicitud pendiente — no se publica');
    return fail('pending_approval');
  }

  // El usuario no es miembro: aparece botón "Unirse al grupo" / "Join group"
  const notMember = await page.evaluate(() => {
    const bodyText = (document.body.innerText || '').toLowerCase();
    return (
      bodyText.includes('unirse al grupo') ||
      bodyText.includes('join group') ||
      bodyText.includes('join this group') ||
      bodyText.includes('únete al grupo') ||
      bodyText.includes('solicitar unirse')
    );
  });

  if (notMember) {
    console.log('[FB] ⚠️ No eres miembro del grupo — botón "Unirse" detectado, saltando');
    return fail('not_member');
  }

  // Mensajes de límite / spam de Facebook: pausar bot desde el planificador
  const isRestricted = await page.evaluate(() => {
    const bodyText = (document.body.innerText || '').toLowerCase();
    const restrictionPhrases = [
      'limitamos la frecuencia',
      'we limit how often',
      'proteger a la comunidad frente al spam',
      'protect the community from spam',
      'vuelve a intentarlo más tarde',
      'try again later',
      'has been blocked',
      'has sido bloqueado',
      'temporalmente bloqueado',
      'temporarily blocked',
      'acción bloqueada',
      'action blocked',
    ];
    return restrictionPhrases.some((p) => bodyText.includes(p));
  });

  if (isRestricted) {
    console.log('[FB] 🚨 Restricción de Facebook detectada (anti-spam / límite)');
    return { success: false, reason: 'facebook_restriction', pauseBot: true };
  }

  await page.evaluate(() =>
    window.scrollBy(0, Math.floor(100 + Math.random() * 201))
  );
  await randomDelay(500, 1500);
  await page.evaluate(() => window.scrollBy(0, Math.floor(50 + Math.random() * 101)));
  await randomDelay(800, 1200);

  await humanMouseMove(page, randomBetween(100, 800), randomBetween(100, 400));

  // Algunos grupos tienen tabs (p. ej. "Vender algo" vs conversación); priorizar el feed de publicación
  try {
    const tabSelectors = [
      '[role="tab"]:has-text("Iniciar una conversación")',
      '[role="tab"]:has-text("Start a conversation")',
      '[role="tab"]:has-text("Discusión")',
      '[role="tab"]:has-text("Discussion")',
    ];
    for (const tabSel of tabSelectors) {
      const tab = await page.$(tabSel);
      if (tab) {
        await tab.click();
        console.log('[FB] ✅ Tab conversación clickeado:', tabSel);
        await randomDelay(1000, 1500);
        break;
      }
    }
  } catch {
    /* continuar */
  }

  /** PASO 2 — Abrir compositor: varios métodos + segundo intento tras scroll arriba */
  let composerClicked = await tryClickComposer(page);

  if (!composerClicked) {
    console.log('[FB] Reintentando después de scroll...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(2000, 3000);
    composerClicked = await tryClickComposer(page);
  }

  if (!composerClicked) {
    writeLog('WARN', 'publishInGroup', { message: 'Compositor no encontrado' });
    return fail('error', 'composer_not_found');
  }

  // Tras abrir compositor: debe aparecer el diálogo; varios intentos antes de rendirse
  await randomDelay(2000, 3000);
  let modal = await page.$('div[role="dialog"]');

  if (!modal) {
    console.log('[FB] Esperando modal más tiempo (intento 2)...');
    await randomDelay(3000, 4000);
    modal = await page.$('div[role="dialog"]');
  }

  if (!modal) {
    console.log('[FB] Modal ausente — scroll, reintento compositor (intento 3)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(1000, 1500);
    await tryClickComposer(page);
    await randomDelay(3000, 4000);
    modal = await page.$('div[role="dialog"]');
  }

  if (!modal) {
    console.log('[FB] Modal no apareció, buscando trigger correcto...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(1000, 1500);

    const triggerCombined =
      '[placeholder="Escribe algo..."], [aria-placeholder="Escribe algo..."], [aria-placeholder="Write something..."], ' +
      '[aria-label="Crear una publicación"], [aria-label="Create a post"], ' +
      'div[role="button"]:has-text("Escribe algo"), div[role="button"]:has-text("Write something")';
    const trigger = await page.$(triggerCombined);
    if (trigger) {
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await randomDelay(400, 800);
      await trigger.click();
      await randomDelay(2000, 3000);
    }
    modal = await page.$('div[role="dialog"]');
  }

  if (!modal) {
    writeLog('WARN', 'publishInGroup', { message: 'Modal no encontrado tras compositor' });
    return fail('modal_not_found');
  }

  const modalText = await page.evaluate(() => {
    const d = document.querySelector('div[role="dialog"]');
    return d ? d.innerText.substring(0, 200) : '';
  });

  if (
    modalText.includes('Comentar') ||
    modalText.includes('Comment') ||
    modalText.includes('Responder') ||
    modalText.includes('Reply')
  ) {
    console.log('[FB] ❌ Modal incorrecto (comentarios) — cerrando');
    await page.keyboard.press('Escape');
    await randomDelay(1000, 1500);
    return fail('wrong_modal_comments');
  }

  console.log('[FB] ✅ Modal correcto:', modalText.substring(0, 50));

  // Algunos grupos muestran primero "Publicar de forma anónima"; da tiempo a que el layout se estabilice
  try {
    const anonToggle = await page.$(
      '[aria-label*="anónim"], [aria-label*="anónimo"], [aria-label*="anonym"], [aria-label*="Anonymous"]'
    );
    if (anonToggle) {
      console.log('[FB] Opción publicar anónimo detectada; se espera sin interactuar (no bloquea el flujo)');
      await randomDelay(500, 1000);
    }
  } catch {
    /* continuar */
  }

  /** Editor real dentro del modal (foco antes de escribir) */
  const editorSelectors = [
    'div[role="dialog"] [contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][aria-label*="publicación"]',
    '[contenteditable="true"][aria-label*="post"]',
    '[contenteditable="true"]',
    'div[role="dialog"] div[role="textbox"]',
    'div[role="textbox"]',
  ];

  let editorFound = false;
  for (const sel of editorSelectors) {
    try {
      const editor = await page.waitForSelector(sel, { state: 'visible', timeout: 5000 });
      if (editor) {
        await editor.click();
        writeLog('INFO', `[FB] Editor encontrado: ${sel}`);
        editorFound = true;
        if (text) {
          await humanTypeText(page, text);
        }
        break;
      }
    } catch {
      /* siguiente */
    }
  }

  if (!editorFound) {
    writeLog('WARN', 'publishInGroup', { message: 'Editor del modal no encontrado' });
    return fail('error', 'editor_not_found');
  }

  /** PASO 4 — Imagen opcional */
  if (imagePath && existsSync(imagePath)) {
    imageAttached = await attachImageHuman(page, imagePath);
  }

  /** Margen extra si hubo imagen adjunta antes de pulsar Publicar */
  if (imagePath && imageAttached) {
    console.log('[FB] Esperando que imagen esté lista para publicar...');
    await randomDelay(4000, 6000);
  }

  /** PASO 5 — Publicar: botón dentro del modal cuando exista */
  const publishSelectors = [
    'div[role="dialog"] [aria-label="Publicar"]',
    'div[role="dialog"] [aria-label="Post"]',
    'div[role="dialog"] div[role="button"]:has-text("Publicar")',
    'div[role="dialog"] div[role="button"]:has-text("Post")',
    '[aria-label="Publicar"][role="button"]',
    '[aria-label="Post"][role="button"]',
    'div[role="button"]:has-text("Publicar")',
    'div[role="button"]:has-text("Post")',
  ];

  /** Captura del modal justo antes de intentar Publicar */
  const beforePublishShot = path.join(process.cwd(), 'debug-before-publish.png');
  await page.screenshot({ path: beforePublishShot, fullPage: false }).catch(() => {});
  console.log('[FB] Screenshot antes de publicar guardado:', beforePublishShot);

  await randomDelay(2000, 3000);

  const modalStillOpen = await page.$('div[role="dialog"]');
  if (!modalStillOpen) {
    console.log('[FB] Modal se cerró inesperadamente');
    writeLog('WARN', 'publishInGroup', { message: 'Modal cerrado antes de publicar' });
    return fail('modal_closed');
  }

  let published = false;
  for (const sel of publishSelectors) {
    try {
      writeLog('INFO', `[FB] Probando botón publicar: ${sel}`);
      const btn = await page.waitForSelector(sel, { state: 'visible', timeout: 5000 });
      if (btn) {
        const disabled = await btn.getAttribute('aria-disabled');
        if (disabled === 'true') {
          writeLog('INFO', '[FB] Botón deshabilitado, esperando...');
          await randomDelay(2000, 3000);
        }
        const box = await btn.boundingBox();
        if (box) await humanMouseMove(page, box.x + 10, box.y + 10);
        await btn.click({ timeout: 10_000 });
        console.log('[FB] ✅ Publicar clickeado:', sel);
        writeLog('INFO', `[FB] Botón Publicar clickeado: ${sel}`);
        published = true;
        break;
      }
    } catch {
      /* siguiente selector */
    }
  }

  if (!published) {
    writeLog('WARN', 'publishInGroup', { message: 'Botón Publicar no encontrado' });
    return fail('error', 'publish_button_not_found');
  }

  /** PASO 6 — Tras publicar: esperar respuesta de la red y comprobar bloqueos (captcha, permisos, etc.) */
  await randomDelay(2000, 4000);

  const blockReason = await detectFacebookBlockingUI(page);
  if (blockReason) {
    return fail(blockReason);
  }

  return {
    success: true,
    groupId: String(groupId),
    ...(imageAttached !== undefined ? { imageAttached } : {}),
  };
}

/**
 * Publica en un grupo: abre Chromium visible (ventana lateral tipo móvil), publica y cierra.
 * No usa la ventana principal de Postrix; una ventana nueva por publicación.
 * Mantiene respuesta { ok, reason } para el planificador.
 */
export async function publishToGroup(accountId, groupId, content) {
  const text = content?.text;
  const imagePath = content?.imagePath;
  console.log('[PublishToGroup] ==================');
  console.log('[PublishToGroup] accountId:', accountId);
  console.log('[PublishToGroup] groupId:', groupId);
  console.log(
    '[PublishToGroup] content text (preview):',
    text != null ? String(text).substring(0, 50) : '(vacío)'
  );
  console.log('[PublishToGroup] imagePath:', imagePath || '(ninguna)');
  console.log('[PublishToGroup] Abriendo Chromium (launchVisibleBrowser)...');
  const timeoutMs = 120_000;
  /** Referencia para cerrar el Chromium si vence el tiempo (evita solapar con el siguiente grupo) */
  let browserRef = null;

  async function runPublish() {
    const { browser, context } = await launchVisibleBrowser(accountId);
    browserRef = browser;
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(120_000);
      const result = await publishInGroup(page, groupId, { text, imagePath });
      if (result.success) {
        return { ok: true };
      }
      const out = {
        ok: false,
        reason: result.reason,
        detail: result.detail,
      };
      if (result.pauseBot) out.pauseBot = true;
      return out;
    } finally {
      await browser.close().catch(() => {});
      if (browserRef === browser) browserRef = null;
    }
  }

  // Un solo resultado resuelto: al timeout se cierra el navegador y luego se devuelve error (sin dejar runPublish huérfano sin cerrar)
  let settled = false;
  return await new Promise((resolve) => {
    const t = setTimeout(async () => {
      if (settled) return;
      if (browserRef) {
        console.log('[FB] Timeout: cerrando navegador de la publicación en curso');
        await browserRef.close().catch(() => {});
        browserRef = null;
      }
      settled = true;
      console.log('[FB] Timeout o error: timeout_group');
      resolve({ ok: false, reason: 'timeout' });
    }, timeoutMs);

    runPublish()
      .then((r) => {
        if (settled) return;
        clearTimeout(t);
        settled = true;
        resolve(r);
      })
      .catch((e) => {
        if (settled) return;
        clearTimeout(t);
        settled = true;
        console.log('[FB] Timeout o error:', e.message);
        resolve({ ok: false, reason: e.message });
      });
  });
}

/**
 * Navega a la sección "Tus grupos", filtra por palabra clave si hay buscador y extrae enlaces.
 * Omite filas con texto de solicitud pendiente (aún no eres miembro aprobado).
 *
 * @param {import('playwright').Page} page
 * @param {string} keyword
 * @returns {Promise<Array<{ id: string, name: string, url: string, members: string, isMember: boolean }>>}
 */
export async function searchInMyGroups(page, keyword) {
  const kw = (keyword || '').trim();
  console.log('[GroupSearch] Navegando a Tus grupos…');

  await page.goto(`${FB_ORIGIN}/groups/feed/`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await sleep(3000);

  // Clic en "Tus grupos" del lateral (si existe)
  try {
    const myGroupsLoc = page
      .locator(
        'a:has-text("Tus grupos"), ' +
          'a:has-text("Your groups"), ' +
          '[aria-label="Tus grupos"], ' +
          '[aria-label="Your groups"]'
      )
      .first();
    await myGroupsLoc.click({ timeout: 5000 });
    console.log('[GroupSearch] ✅ Clic en Tus grupos');
    await sleep(2000);
  } catch (e) {
    console.log('[GroupSearch] No se encontró enlace «Tus grupos», se continúa con la vista actual');
  }

  // Buscador interno de la lista (solo grupos donde eres miembro)
  if (kw) {
    try {
      const searchBox = page.locator(
        '[placeholder="Buscar grupos"], ' +
          '[placeholder="Search groups"], ' +
          'input[type="search"]'
      );
      await searchBox.first().click({ timeout: 5000 });
      await sleep(500);
      await searchBox.first().fill(kw);
      await sleep(2000);
      console.log('[GroupSearch] ✅ Búsqueda por palabra clave:', kw);
    } catch (e) {
      console.log('[GroupSearch] Sin buscador interno, se listan todos los enlaces visibles');
    }
  }

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const sidebar = document.querySelector('[role="navigation"], aside, nav');
      if (sidebar) sidebar.scrollTop += 500;
      else window.scrollBy(0, 500);
    });
    await sleep(1000);
  }

  const groups = await page.evaluate((filterKw) => {
    const results = [];
    const allLinks = document.querySelectorAll('a[href*="/groups/"]');
    const kwLow = (filterKw || '').trim().toLowerCase();

    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/groups\/(\d+)/);
      if (!match) continue;
      const groupId = match[1];
      if (groupId === 'feed' || groupId === 'discover') continue;

      const nameEl = link.querySelector('span, div');
      const groupName =
        nameEl?.innerText?.trim() ||
        link.innerText?.trim() ||
        link.getAttribute('aria-label') ||
        '';

      if (!groupId || !groupName || groupName.length < 3) continue;
      if (kwLow && !groupName.toLowerCase().includes(kwLow)) continue;

      // Excluir filas donde la membresía aún no está aprobada
      const parentEl =
        link.closest('[role="listitem"]') || link.closest('li') || link.parentElement?.parentElement;
      const parentText = (parentEl?.innerText || '').toLowerCase();
      const isPending =
        parentText.includes('pendiente') ||
        parentText.includes('pending') ||
        parentText.includes('solicitud enviada') ||
        parentText.includes('request sent') ||
        parentText.includes('solicitud pendiente') ||
        parentText.includes('awaiting approval');
      if (isPending) continue;

      results.push({
        id: groupId,
        name: groupName.replace(/\s+/g, ' ').trim(),
        url: `https://www.facebook.com/groups/${groupId}`,
        members: '',
        isMember: true,
      });
    }

    const seen = new Set();
    return results.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  }, kw);

  console.log('[GroupSearch] Grupos encontrados:', groups.length);
  return groups;
}

/**
 * Búsqueda global por palabra clave (fallback): /search/groups/?q=
 * Resultados con flag isMember según textos de la tarjeta (ES/EN).
 */
export async function searchGroupsByKeyword(keyword, { accountId = 'default' } = {}) {
  const { browser, context } = await launchVisibleBrowser(accountId);
  const page = await context.newPage();
  const q = encodeURIComponent(keyword);
  const searchUrl = `${FB_ORIGIN}/search/groups/?q=${q}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try {
      await page.waitForSelector('[role="feed"]', { timeout: 10000 });
    } catch (e) {
      writeLog('WARN', 'searchGroupsByKeyword', {
        message: 'Timeout esperando [role=feed]; se intenta extraer del documento',
      });
    }
    await sleep(1500);
    // Scroll para cargar más resultados (5 pasadas + espera final para lazy-load)
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, Math.max(800, window.innerHeight));
      });
      await sleep(1500);
    }
    await sleep(3000);

    const scraped = await page.evaluate(() => {
      const root = document.querySelector('[role="feed"]') || document.body;
      if (!root) return [];

      /**
       * Membresía: revisar TODO el HTML y el texto del contenedor del grupo.
       * "join" / "unirse" se comprueban con límite de palabra para no confundir con "joined".
       */
      function detectIsMember(el) {
        if (!el) return false;
        const elementHTML = (el.innerHTML || '').toLowerCase();
        const elementText = (el.innerText || '').toLowerCase();
        const blob = `${elementText}\n${elementHTML}`;

        const memberKeywords = [
          'eres miembro',
          "you're a member",
          'you are a member',
          'ver grupo',
          'view group',
          'miembro',
          'joined',
          'te uniste',
          'unido',
          'joined group',
          'leave group',
          'salir del grupo',
          'abandonar grupo',
          'notificaciones',
          'notifications',
        ];

        const nonMemberKeywords = [
          'unirse al grupo',
          'join group',
          'join',
          'unirse',
          'solicitar unirse',
          'request to join',
        ];

        function keywordMatches(k) {
          const low = k.toLowerCase();
          if (low.includes(' ') || low.length > 15) {
            return blob.includes(low);
          }
          if (low === 'miembro') {
            return /\bmiembro\b/i.test(blob);
          }
          if (low === 'join') {
            return /\bjoin\b/i.test(blob);
          }
          if (low === 'unirse') {
            return /\bunirse\b/i.test(blob);
          }
          return blob.includes(low);
        }

        const hasMemberText = memberKeywords.some((k) => keywordMatches(k));
        const hasNonMemberText = nonMemberKeywords.some((k) => keywordMatches(k));

        return hasMemberText && !hasNonMemberText;
      }

      const byId = new Map();
      const anchors = root.querySelectorAll('a[href*="/groups/"]');
      anchors.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const m = href.match(/\/groups\/(\d+)/);
        if (!m) return;
        const id = m[1];
        if (byId.has(id)) return;

        let card = a.closest('[role="article"]');
        if (!card) {
          let el = a.parentElement;
          for (let d = 0; d < 14 && el; d++) {
            if (el.getAttribute && el.getAttribute('role') === 'article') {
              card = el;
              break;
            }
            el = el.parentElement;
          }
        }
        if (!card) card = a.closest('div');

        const text = card ? card.innerText || '' : '';
        let name = (a.innerText || '').trim().replace(/\s+/g, ' ');
        if (!name || name.length < 2) {
          const h = card?.querySelector('span[dir="auto"], h2, h3, [role="heading"]');
          if (h) name = (h.innerText || '').trim();
        }
        if (!name) name = `Grupo ${id}`;

        let members = '';
        const memMatch = text.match(/([\d.,]+[kmKM]?)\s*(miembros|members)/i);
        if (memMatch) members = memMatch[0].trim();

        const isMember = detectIsMember(card);
        const url = `https://www.facebook.com/groups/${id}`;
        byId.set(id, { id, name, url, members, isMember });
      });

      return Array.from(byId.values());
    });

    await browser.close();

    const uniq = [];
    const seen = new Set();
    for (const r of scraped) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        uniq.push(r);
      }
    }
    return uniq;
  } catch (err) {
    writeLog('ERROR', 'searchGroupsByKeyword', { message: err.message });
    await browser.close().catch(() => {});
    return [];
  }
}
