/**
 * Registro de logs en archivo local para depuración (Windows 10/11).
 */
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';

let logDir = null;
let logFile = null;

/**
 * Inicializa rutas de log (llamar desde main con app.getPath('userData')).
 */
export function initLogger(userDataPath) {
  logDir = join(userDataPath, 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  logFile = join(logDir, 'postrix.log');
}

function timestamp() {
  return new Date().toISOString();
}

/**
 * Añade una línea al archivo de log y opcionalmente muestra en consola.
 */
export function writeLog(level, message, meta = null) {
  const line = `[${timestamp()}] [${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`;
  try {
    if (logFile) appendFileSync(logFile, line, 'utf8');
  } catch (e) {
    console.error('[logger] no se pudo escribir log:', e.message);
  }
  if (level === 'ERROR' || level === 'WARN') {
    console.error(`[${level}]`, message, meta || '');
  } else {
    console.log(`[${level}]`, message);
  }
}

export function getLogFilePath() {
  return logFile;
}
