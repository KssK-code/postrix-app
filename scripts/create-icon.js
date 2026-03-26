/**
 * Crea la carpeta assets/ (placeholder antes de generar icon.ico).
 * Para generar icon.png + icon.ico automáticamente: npm run icon
 */
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dirname, '../assets'), { recursive: true });

console.log('Carpeta assets creada.');
console.log('IMPORTANTE: Reemplaza assets/icon.ico con');
console.log('tu ícono real de Postrix antes del build final.');
console.log('O ejecuta: npm run icon  (genera PNG + ICO de marca).');
