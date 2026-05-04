/**
 * Prebuild: copia los binarios de Playwright (Chromium) desde el cache global
 * (%LOCALAPPDATA%/ms-playwright) a ./ms-playwright para que electron-builder
 * los empaquete via extraResources. Sin esto, el .exe en máquinas limpias no
 * encuentra chrome.exe y el botón "Conectar Facebook" falla en silencio.
 */
import fsExtra from 'fs-extra';
import path from 'path';
import os from 'os';

const localAppData =
  process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const src = path.join(localAppData, 'ms-playwright');
const dst = path.join(process.cwd(), 'ms-playwright');

if (!fsExtra.existsSync(src)) {
  console.error(`[prebuild] No se encontró ${src}.`);
  console.error(`[prebuild] Ejecuta primero: npx playwright install chromium`);
  process.exit(1);
}

console.log(`[prebuild] Copiando ${src} -> ${dst}...`);
fsExtra.removeSync(dst);
fsExtra.copySync(src, dst, { dereference: true });
console.log(`[prebuild] OK Playwright browsers copiados a ./ms-playwright`);
