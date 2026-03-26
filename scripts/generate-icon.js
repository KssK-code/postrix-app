/**
 * Genera assets/icon.png (256×256) y assets/icon.ico para electron-builder (Windows).
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '../assets');
mkdirSync(assetsDir, { recursive: true });

const pngPath = join(assetsDir, 'icon.png');
const icoPath = join(assetsDir, 'icon.ico');

// Color de marca Postrix (aprox. #6C63FF)
await sharp({
  create: {
    width: 256,
    height: 256,
    channels: 4,
    background: { r: 108, g: 99, b: 255, alpha: 1 },
  },
})
  .png()
  .toFile(pngPath);

const pngBuf = readFileSync(pngPath);
const icoBuf = await toIco([pngBuf]);
writeFileSync(icoPath, icoBuf);

console.log('✅ icon.png creado en assets/');
console.log('✅ icon.ico creado en assets/ (listo para electron-builder)');
