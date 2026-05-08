/**
 * Registro de logs en archivo local con rotación automática para depuración (Windows 10/11).
 *
 * Las escrituras son asíncronas con una micro-queue serializada: writeLog() encola la línea
 * y retorna inmediatamente sin bloquear el event loop del proceso main. Un worker drena la
 * cola usando appendFile (no Sync). La rotación se evalúa al inicio de cada flush.
 *
 * Si el flush falla, el error va a stderr — el log nunca debe romper la app.
 */
import { appendFile, mkdir, stat, rename, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let logDir = null;
let logFile = null;

/** Tamaño máximo del log activo antes de rotar (5 MB). */
const MAX_LOG_BYTES = 5 * 1024 * 1024;
/** Cantidad de archivos rotados a conservar (postrix.log.1 ... postrix.log.N). */
const MAX_LOG_BACKUPS = 3;

/** Cola de líneas pendientes de escribir; se drena en orden FIFO. */
const writeQueue = [];
/** Worker activo: solo uno a la vez para serializar escrituras al mismo archivo. */
let flushing = false;

/**
 * Inicializa rutas de log (llamar desde main con app.getPath('userData')).
 * Usa mkdir síncrono solo aquí — es una vez al arranque, no en hot path.
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
 * Si el archivo activo supera el tamaño máximo, rota:
 *   postrix.log.2 → postrix.log.3 (descartando postrix.log.3 anterior)
 *   postrix.log.1 → postrix.log.2
 *   postrix.log   → postrix.log.1
 * Falla silenciosamente: el log nunca debe romper la app.
 */
async function rotateIfNeeded() {
  if (!logFile) return;
  try {
    const st = await stat(logFile);
    if (st.size < MAX_LOG_BYTES) return;
  } catch {
    return; // archivo aún no existe o no accesible
  }

  try {
    const oldest = `${logFile}.${MAX_LOG_BACKUPS}`;
    if (existsSync(oldest)) {
      try { await unlink(oldest); } catch { /* permisos */ }
    }
    for (let i = MAX_LOG_BACKUPS - 1; i >= 1; i--) {
      const src = `${logFile}.${i}`;
      const dst = `${logFile}.${i + 1}`;
      if (existsSync(src)) {
        try { await rename(src, dst); } catch { /* en uso o permisos */ }
      }
    }
    try { await rename(logFile, `${logFile}.1`); } catch { /* en uso */ }
  } catch (e) {
    console.error('[logger] no se pudo rotar el log:', e.message);
  }
}

/**
 * Drena la cola de escrituras. Solo una instancia activa a la vez (flag `flushing`).
 * No retorna promesa al caller de writeLog: la escritura es fire-and-forget.
 */
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    while (writeQueue.length > 0 && logFile) {
      // Toma todas las líneas acumuladas en este tick para minimizar I/O
      const batch = writeQueue.splice(0, writeQueue.length).join('');
      await rotateIfNeeded();
      try {
        await appendFile(logFile, batch, 'utf8');
      } catch (e) {
        console.error('[logger] no se pudo escribir log:', e.message);
        // Sin reintento: si el FS está corrupto, no queremos crecer la queue infinitamente
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Encola una línea de log y dispara el flush async.
 * No bloquea el event loop. Si el archivo aún no se inicializó, el log se descarta
 * silenciosamente (early-bootstrap calls antes de initLogger).
 */
export function writeLog(level, message, meta = null) {
  const line = `[${timestamp()}] [${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`;

  if (logFile) {
    writeQueue.push(line);
    // Disparo del worker. No esperamos: queremos retorno inmediato.
    void flush();
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
