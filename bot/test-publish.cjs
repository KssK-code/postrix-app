/**
 * Prueba de publicación (CommonJS). Ejecutar desde postrix-app:
 *   node bot/test-publish.cjs
 *
 * Usa publishInGroup desde facebook.js (ESM) vía import dinámico.
 * PowerShell: $env:TEST_GROUP_ID='...'; node bot/test-publish.cjs
 * Imagen opcional: $env:TEST_IMAGE_PATH='C:\ruta\foto.jpg'
 */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const { createHash } = require('crypto');

function encryptionKey() {
  const base = process.env.POSTRIX_STORE_KEY || 'postrix-solvix-store-v1';
  return createHash('sha256').update(base).digest('base64').slice(0, 32);
}

console.log('[POSTRIX TEST] =============================');
console.log('[POSTRIX TEST] Script iniciado');
console.log('[POSTRIX TEST] Node version:', process.version);
console.log('[POSTRIX TEST] =============================');

const GROUP_ID = process.env.TEST_GROUP_ID || '2754396398206749';
console.log('[POSTRIX TEST] Group ID:', GROUP_ID);

async function main() {
  console.log('[POSTRIX TEST] Función main iniciada');

  let cookies = [];
  try {
    const Store = require('electron-store').default;
    const storePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Postrix by Solvix');
    console.log('[POSTRIX TEST] Store path:', storePath);

    const store = new Store({
      projectName: 'postrix',
      name: 'postrix-config',
      cwd: storePath,
      encryptionKey: encryptionKey(),
    });
    const raw = store.get('fb_session_cookies');
    if (raw) {
      cookies = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(cookies) || cookies.length === 0) {
        console.log('[POSTRIX TEST] ❌ Cookies inválidas (no es array con datos)');
        process.exit(1);
      }
      console.log('[POSTRIX TEST] Cookies encontradas:', cookies.length);
    } else {
      console.log('[POSTRIX TEST] ❌ Sin cookies - conecta Facebook primero');
      process.exit(1);
    }
  } catch (err) {
    console.log('[POSTRIX TEST] ❌ Error store:', err.message);
    process.exit(1);
  }

  console.log('[POSTRIX TEST] Abriendo Chromium...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  const page = await context.newPage();

  const { publishInGroup } = await import('./facebook.js');
  console.log('[POSTRIX TEST] Ejecutando publishInGroup (comportamiento humano)...');

  const imagePath = process.env.TEST_IMAGE_PATH || undefined;
  const result = await publishInGroup(page, GROUP_ID, {
    text: 'Hola! Prueba de Postrix by Solvix 🚀',
    imagePath,
  });

  console.log('[POSTRIX TEST] Resultado:', JSON.stringify(result, null, 2));
  console.log(
    '[POSTRIX TEST] Imagen adjuntada:',
    imagePath ? result.imageAttached : '(sin TEST_IMAGE_PATH — solo texto)'
  );

  if (!result.success) {
    const shotPath = path.join(process.cwd(), 'debug-screenshot.png');
    await page.screenshot({ path: shotPath }).catch(() => {});
    console.log('[POSTRIX TEST] Captura de fallo (si se pudo):', shotPath);
  }

  await browser.close().catch(() => {});
  console.log('[POSTRIX TEST] Finalizado');
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.log('[POSTRIX TEST] ❌ Error fatal:', err.message);
  process.exit(1);
});
