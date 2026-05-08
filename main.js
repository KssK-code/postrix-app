/**
 * Proceso principal de Electron — ventana, IPC y orquestación del bot.
 */
import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
// electron-updater es CommonJS — importar por default y desestructurar.
import electronUpdaterPkg from 'electron-updater';
const { autoUpdater } = electronUpdaterPkg;

import { initLogger, writeLog, getLogFilePath } from './utils/logger.js';
import { getStore } from './config/settings.js';
import {
  parseUrlsFromText,
  mergeGroups,
  saveGroups,
  loadGroups,
  searchGroups,
  verifyMarketplaceForGroups,
} from './bot/groupManager.js';
import {
  connectFacebookVisible,
  refreshFacebookDisplayName,
  resolveGroupIdFromSlug,
  BUNDLED_CHROME,
} from './bot/facebook.js';
import {
  startScheduler,
  pauseScheduler,
  resumeScheduler,
  stopScheduler,
  getSchedulerState,
  getFacebookRestrictionBlockInfo,
} from './bot/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * Captura cualquier error no manejado del proceso main para que el cliente nunca
 * vea un cierre silencioso. Si el logger aún no está inicializado, cae a stderr.
 */
function safeWriteCrashLog(level, message, meta) {
  try {
    writeLog(level, message, meta);
  } catch {
    console.error(`[${level}]`, message, meta || '');
  }
}

process.on('uncaughtException', (err) => {
  safeWriteCrashLog('ERROR', '[MAIN] uncaughtException', {
    message: err?.message || String(err),
    stack: err?.stack || '(sin stack)',
    name: err?.name || 'Error',
  });
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : null;
  safeWriteCrashLog('ERROR', '[MAIN] unhandledRejection', {
    message: err?.message || String(reason),
    stack: err?.stack || '(sin stack)',
    name: err?.name || 'UnhandledRejection',
  });
});

/**
 * Corrige store antiguo con horas erróneas; resetea sesión de campaña.
 * No toca warmUpEnabled: el valor lo elige el usuario en la app (o el default del store).
 */
function migrateCriticalStoreRules() {
  const store = getStore();
  const rules = { ...(store.get('rules') || {}) };

  if (!rules.hourStart || rules.hourStart === '21:46') {
    rules.hourStart = '09:00';
    console.log('[MAIN] Reset hourStart a 09:00');
  }
  if (!rules.hourEnd || rules.hourEnd === '19:13') {
    rules.hourEnd = '19:00';
    console.log('[MAIN] Reset hourEnd a 19:00');
  }

  store.set('rules', rules);

  const campaign = store.get('campaign') || {};
  store.set('campaign', {
    ...campaign,
    session: {
      intervalHours: 3,
      hourEnd: '19:00',
      maxGroupsPerRound: 20,
    },
  });
  console.log('[MAIN] campaign.session reseteado a valores por defecto');
}

process.env.APP_VERSION = process.env.APP_VERSION || '1.0.0';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
    title: 'Postrix by Solvix',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  /** Solo abrir DevTools en modo desarrollo (no en build NSIS / producción). */
  if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[Postrix] did-fail-load', { code, desc, url });
  });
}

function broadcast(channel, payload) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

/**
 * Configura electron-updater para descargar actualizaciones de GitHub Releases en background.
 * Es totalmente fire-and-forget: cualquier fallo se logea sin afectar el arranque ni mostrar
 * UI nativa al usuario. La instalación queda disparada por click explícito en el banner.
 *
 * No corre en modo dev (auto-update solo funciona con la app empaquetada y firmada).
 */
function setupAutoUpdater() {
  if (!app.isPackaged) {
    writeLog('INFO', '[Updater] omitido — app no empaquetada (modo dev)');
    return;
  }

  try {
    autoUpdater.logger = {
      info: (m) => writeLog('INFO', '[Updater] ' + String(m)),
      warn: (m) => writeLog('WARN', '[Updater] ' + String(m)),
      error: (m) => writeLog('ERROR', '[Updater] ' + String(m)),
      debug: () => {},
    };

    // Descarga automática en background tras detectar update
    autoUpdater.autoDownload = true;
    // No instalar al cerrar — esperar click explícito del usuario en el banner
    autoUpdater.autoInstallOnAppQuit = false;
    // Sin notificaciones nativas: el usuario decide vía nuestro banner
    autoUpdater.disableWebInstaller = true;

    autoUpdater.on('update-available', (info) => {
      writeLog('INFO', '[Updater] update-available', {
        version: info?.version,
        releaseDate: info?.releaseDate,
      });
    });

    autoUpdater.on('update-not-available', () => {
      writeLog('INFO', '[Updater] sin actualización disponible');
    });

    autoUpdater.on('download-progress', (p) => {
      // Loguear cada 25% para no saturar el archivo
      const pct = Math.round(p?.percent || 0);
      if (pct % 25 === 0) {
        writeLog('INFO', '[Updater] descarga en progreso', { pct, transferred: p?.transferred });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      writeLog('INFO', '[Updater] update-downloaded', { version: info?.version });
      broadcast('app:update-ready', {
        version: info?.version || null,
        releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : null,
      });
    });

    autoUpdater.on('error', (err) => {
      // Errores silenciosos: sin internet, repo no accesible, etc.
      writeLog('WARN', '[Updater] error (silenciado para el usuario)', {
        message: err?.message || String(err),
      });
    });

    // Disparar el check sin esperarlo. Cualquier excepción se atrapa abajo.
    autoUpdater.checkForUpdates().catch((err) => {
      writeLog('WARN', '[Updater] checkForUpdates falló (silenciado)', {
        message: err?.message || String(err),
      });
    });
  } catch (err) {
    // Defensa final: si algo del setup mismo falla (require, config, etc.), no romper la app.
    writeLog('ERROR', '[Updater] setup falló — auto-update deshabilitado en esta sesión', {
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}

app.whenReady().then(async () => {
  initLogger(app.getPath('userData'));
  writeLog('INFO', 'Postrix iniciando', { version: process.env.APP_VERSION });

  migrateCriticalStoreRules();

  createWindow();

  // Auto-update en background — totalmente independiente del arranque normal
  try {
    setupAutoUpdater();
  } catch (err) {
    writeLog('ERROR', '[MAIN] setupAutoUpdater lanzó (ignorado)', {
      message: err?.message || String(err),
    });
  }

  ipcMain.handle('settings:get', () => {
    const s = getStore();
    return s.store && typeof s.store === 'object' ? { ...s.store } : {};
  });
  ipcMain.handle('store:get', (_event, key) => {
    return getStore().get(key);
  });
  ipcMain.handle('settings:set', (_, patch) => {
    const store = getStore();
    for (const [k, v] of Object.entries(patch || {})) {
      if (k === 'rules' && v && typeof v === 'object') {
        store.set('rules', { ...(store.get('rules') || {}), ...v });
      } else if (k === 'campaign' && v && typeof v === 'object') {
        store.set('campaign', { ...(store.get('campaign') || {}), ...v });
      } else if (k === 'notifications' && v && typeof v === 'object') {
        store.set('notifications', { ...(store.get('notifications') || {}), ...v });
      } else if (k === 'stats' && v && typeof v === 'object') {
        store.set('stats', { ...(store.get('stats') || {}), ...v });
      } else {
        store.set(k, v);
      }
    }
    const s = getStore();
    return s.store && typeof s.store === 'object' ? { ...s.store } : {};
  });

  ipcMain.handle('groups:extractIds', async (_, text) => {
    const { ids, needResolve } = parseUrlsFromText(text);
    const additions = [...ids];
    for (const item of needResolve) {
      const resolved = await resolveGroupIdFromSlug(item.slug);
      if (resolved) {
        additions.push({
          id: resolved,
          name: `Grupo ${resolved}`,
          url: item.url,
          status: 'active',
          membership: 'pending',
        });
      }
    }
    const merged = mergeGroups(loadGroups(), additions);
    saveGroups(merged);
    return { groups: merged, resolved: additions.length };
  });

  ipcMain.handle('groups:list', () => loadGroups());
  ipcMain.handle('groups:save', (_, list) => {
    saveGroups(list);
    return loadGroups();
  });

  ipcMain.handle('groups:search', async (event, keyword) => {
    const wc = event.sender;
    return searchGroups(keyword, {
      onProgress: (payload) => {
        try {
          wc.send('groups:searchProgress', payload);
        } catch {
          /* ventana cerrada */
        }
      },
    });
  });

  ipcMain.handle('groups:verifyMarketplace', async (_, items) => {
    const store = getStore();
    const accountId = store.get('activeAccountId') || 'default';
    return verifyMarketplaceForGroups(items, accountId);
  });

  ipcMain.handle('groups:importTxt', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Texto', extensions: ['txt'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return null;
    const raw = fs.readFileSync(filePaths[0], 'utf8');
    const { ids, needResolve } = parseUrlsFromText(raw);
    const additions = [...ids];
    for (const item of needResolve) {
      const resolved = await resolveGroupIdFromSlug(item.slug);
      if (resolved) {
        additions.push({
          id: resolved,
          name: `Grupo ${resolved}`,
          status: 'active',
          membership: 'pending',
        });
      }
    }
    const merged = mergeGroups(loadGroups(), additions);
    saveGroups(merged);
    return merged;
  });

  ipcMain.handle('groups:exportTxt', async () => {
    const groups = loadGroups();
    const lines = groups.map((g) => `https://www.facebook.com/groups/${g.id}`);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'postrix-grupos.txt',
      filters: [{ name: 'Texto', extensions: ['txt'] }],
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return true;
  });

  ipcMain.handle('history:exportCsv', async () => {
    const rows = getStore().get('history') || [];
    const header = 'Fecha,Grupo,Copy,Imagen,Resultado\n';
    const body = rows
      .map((r) =>
        [
          r.at,
          `"${String(r.groupName || '').replace(/"/g, '""')}"`,
          `"${String(r.copy || '').replace(/"/g, '""')}"`,
          `"${String(r.image || '').replace(/"/g, '""')}"`,
          r.result,
        ].join(',')
      )
      .join('\n');
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'postrix-historial.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, header + body, 'utf8');
    return true;
  });

  ipcMain.handle('facebook:connect', async () => {
    console.log('[IPC] facebook:connect');
    try {
      const store = getStore();
      const accId = store.get('activeAccountId') || 'default';
      writeLog('INFO', '[IPC] facebook:connect iniciado', {
        accId,
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '(default)',
        bundledChrome: BUNDLED_CHROME || '(none)',
        platform: process.platform,
      });
      const res = await connectFacebookVisible(accId);
      if (res.success) {
        return { success: true, name: res.name, photo: res.photo };
      }
      return { success: false, error: res.error || 'unknown', logFile: getLogFilePath() };
    } catch (err) {
      writeLog('ERROR', '[IPC] facebook:connect EXCEPCIÓN', {
        message: err.message,
        stack: err.stack,
      });
      return { success: false, error: err.message, logFile: getLogFilePath() };
    }
  });

  /** Solo relee el nombre con cookies guardadas (sin abrir login). */
  ipcMain.handle('facebook:refreshName', async () => {
    try {
      return await refreshFacebookDisplayName();
    } catch (err) {
      console.error('[facebook:refreshName]', err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('facebook:disconnect', async () => {
    try {
      const store = getStore();
      store.delete('fb_session_cookies');
      store.delete('fb_user_name');
      store.delete('facebookAccounts');
      store.delete('activeAccountId');
      writeLog('INFO', '[MAIN] Facebook desconectado — store limpiado');
      console.log('[MAIN] Facebook desconectado - store limpiado');
      return { ok: true, success: true };
    } catch (err) {
      console.error('[facebook:disconnect]', err.message);
      return { ok: false, success: false, error: err.message };
    }
  });

  ipcMain.handle('bot:start', async (_event, accountIdArg) => {
    const store = getStore();
    const accountId = accountIdArg || store.get('activeAccountId') || 'default';

    console.log('[MAIN] =============================');
    console.log('[MAIN] bot:start recibido');
    console.log('[MAIN] accountId:', accountId);
    console.log('[MAIN] =============================');

    try {
      const fbBlock = getFacebookRestrictionBlockInfo(store);
      if (fbBlock.blocked) {
        const msg = `Bot en pausa por restricción de Facebook. Reintenta en ${fbBlock.hoursLeft} horas.`;
        console.log('[MAIN] bot:start bloqueado:', msg);
        broadcast('bot:status', { status: 'paused' });
        return {
          ...getSchedulerState(),
          ok: false,
          error: msg,
          restrictionUntil: fbBlock.until,
        };
      }

      const groups = store.get('groups') || [];
      console.log('[MAIN] Grupos en store:', groups.length);

      // Validación de cookies antes de abrir Chromium (evita arranque inútil)
      const rawCookies = store.get('fb_session_cookies');
      let cookiesValid = false;
      if (rawCookies && typeof rawCookies === 'string' && rawCookies.length > 10) {
        try {
          const parsed = JSON.parse(rawCookies);
          cookiesValid = Array.isArray(parsed) && parsed.length > 0;
        } catch {
          cookiesValid = false;
        }
      }
      console.log('[MAIN] Cookies FB:', cookiesValid ? 'válidas' : 'AUSENTES o corruptas');

      if (!cookiesValid) {
        const msg = 'No hay sesión de Facebook conectada. Conecta tu cuenta antes de iniciar.';
        writeLog('WARN', '[MAIN] bot:start abortado — cookies ausentes o inválidas', { accountId });
        broadcast('bot:status', { status: 'stopped' });
        broadcast('bot:progress', { status: 'session_expired' });
        return {
          ...getSchedulerState(),
          ok: false,
          error: msg,
          reason: 'no_cookies',
        };
      }

      const slots = store.get('contentSlots') || [];
      console.log('[MAIN] Slots contenido:', slots.length);

      store.set('campaign', { ...(store.get('campaign') || {}), status: 'running' });

      const onTick = (payload) => {
        if (payload && typeof payload === 'object') {
          console.log('[MAIN] onTick:', payload.status, payload.nextDelayMs);
        }
        broadcast('bot:tick', getSchedulerState());
      };
      const onProgress = (data) => {
        broadcast('bot:progress', data);
        if (data && data.status === 'restriction_detected') {
          broadcast('bot:status', { status: 'paused' });
        }
        if (data && data.status === 'session_expired') {
          broadcast('bot:status', { status: 'stopped' });
          if (Notification.isSupported()) {
            new Notification({
              title: 'Postrix — Sesión de Facebook expirada',
              body: 'Tu sesión de Facebook expiró. Vuelve a conectar tu cuenta para continuar publicando.',
            }).show();
          }
          writeLog('ERROR', '[MAIN] Sesión de Facebook expirada — bot detenido, usuario notificado');
        }
        if (data && data.status === 'round_summary' && Notification.isSupported()) {
          const nextTime = new Date(Date.now() + (data.nextDelayMs || 0));
          const timeStr = nextTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          new Notification({
            title: 'Postrix — Ronda completada',
            body: `Publicados ${data.published} de ${data.total} grupos. Próxima ronda a las ${timeStr}`,
          }).show();
        }
      };

      console.log('[MAIN] Llamando startScheduler...');
      await startScheduler(accountId, onTick, onProgress);
      console.log('[MAIN] startScheduler completado');

      broadcast('bot:status', { status: 'running' });
      writeLog('INFO', 'Bot START');
      return getSchedulerState();
    } catch (err) {
      console.error('[MAIN] ERROR en bot:start:', err.message);
      console.error('[MAIN] Stack:', err.stack);
      return { ...getSchedulerState(), ok: false, error: err.message };
    }
  });

  ipcMain.handle('bot:pause', async () => {
    pauseScheduler();
    getStore().set('campaign', {
      ...(getStore().get('campaign') || {}),
      status: 'paused',
    });
    broadcast('bot:status', { status: 'paused' });
    return getSchedulerState();
  });

  ipcMain.handle('bot:resume', async () => {
    const store = getStore();
    const fbBlock = getFacebookRestrictionBlockInfo(store);
    if (fbBlock.blocked) {
      const msg = `Bot en pausa por restricción de Facebook. Reintenta en ${fbBlock.hoursLeft} horas.`;
      return {
        ...getSchedulerState(),
        ok: false,
        error: msg,
        restrictionUntil: fbBlock.until,
      };
    }
    const resumed = resumeScheduler();
    if (!resumed) {
      return { ...getSchedulerState(), ok: false, error: 'No se pudo reanudar.' };
    }
    store.set('campaign', {
      ...(store.get('campaign') || {}),
      status: 'running',
    });
    broadcast('bot:status', { status: 'running' });
    return getSchedulerState();
  });

  ipcMain.handle('bot:stop', async () => {
    stopScheduler();
    getStore().set('campaign', {
      ...(getStore().get('campaign') || {}),
      status: 'stopped',
    });
    broadcast('bot:status', { status: 'stopped' });
    writeLog('INFO', 'Bot STOP');
    return getSchedulerState();
  });

  ipcMain.handle('bot:state', () => getSchedulerState());

  ipcMain.handle('dialog:selectImage', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return null;
    return filePaths[0];
  });

  ipcMain.handle('shell:openExternal', async (_, url) => {
    if (typeof url === 'string' && url.startsWith('http')) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  /**
   * Instala la actualización descargada y reinicia. Llamado desde el banner del renderer.
   * Si no hay update lista o falla, logea y retorna ok=false sin romper.
   */
  ipcMain.handle('app:installUpdate', async () => {
    try {
      writeLog('INFO', '[Updater] usuario solicitó instalar y reiniciar');
      // isSilent=false para mostrar barra de progreso del instalador,
      // isForceRunAfter=true para relanzar Postrix tras instalar.
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (err) {
      writeLog('ERROR', '[Updater] quitAndInstall falló', {
        message: err?.message || String(err),
      });
      return { ok: false, error: err?.message || 'unknown' };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopScheduler();
  if (process.platform !== 'darwin') app.quit();
});
