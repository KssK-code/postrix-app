# Silent Failures + Botón de Diagnóstico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar los fallos silenciosos al darle publicar mostrando banners persistentes en cada condición de error, y agregar un botón "📋 Copiar diagnóstico" en Ajustes para que clientes no técnicos puedan enviar contexto a soporte sin buscar logs.

**Architecture:** 
- Parte 1: El scheduler emite `bot:progress` para cada salida silenciosa; el renderer convierte esos eventos en un banner persistente `#bot-info-banner`; `handleBotStartOrResume` también muestra el banner cuando detecta requisitos faltantes antes de llamar al IPC.
- Parte 2: Un nuevo handler IPC `diagnostics:collect` en main.js lee el store, el estado del scheduler y las últimas 50 líneas del log; el renderer formatea y copia al portapapeles al hacer clic en el botón.

**Tech Stack:** Electron (IPC main↔renderer), renderer.js (DOM puro sin framework), node-cron scheduler, electron-store, fs nativo para leer el log.

---

## Mapa de archivos

| Archivo | Acción | Qué cambia |
|---|---|---|
| `postrix-app/src/index.html` | Modificar | Nuevo `#bot-info-banner`; botón `#btn-copy-diagnostics` en settings |
| `postrix-app/src/styles.css` | Modificar | Clase `.bot-info-card` (variante ámbar de `.restriction-card`) |
| `postrix-app/src/renderer.js` | Modificar | Strings i18n; funciones `showBotInfoBanner`/`hideBotInfoBanner`; fix `handleBotStartOrResume`; nuevos casos en `onBotProgress`; handler del botón diagnóstico |
| `postrix-app/bot/scheduler.js` | Modificar | `progressPayload` en todos los early-returns silenciosos |
| `postrix-app/main.js` | Modificar | Import `getHardwareIdSync`; handler `diagnostics:collect` |
| `postrix-app/preload.cjs` | Modificar | Exponer `collectDiagnostics` |

---

## Task 1: Agregar `#bot-info-banner` al HTML de la campaña

**Files:**
- Modify: `postrix-app/src/index.html:117-124`

- [ ] **Step 1: Insertar el div del banner después de `#session-expired-alert`**

Busca este bloque en `index.html` (línea ~117):
```html
          </div>
        </div>

          <!-- 1. Configuración rápida (sesión) -->
```

Inserta entre `</div></div>` del session-expired-alert y el comentario de configuración rápida:

```html
          <!-- Banner informativo: fuera de horario, sin grupos, etc. -->
          <div id="bot-info-banner" class="restriction-card bot-info-card hidden" role="alert">
            <span class="restriction-card-emoji" aria-hidden="true">⚠️</span>
            <div class="restriction-card-body">
              <strong id="bot-info-banner-title"></strong>
              <p id="bot-info-banner-msg"></p>
            </div>
          </div>
```

- [ ] **Step 2: Verificar que el HTML compila sin errores de sintaxis**

Abre `index.html` en el editor y confirma que las etiquetas están balanceadas. No hay prueba automatizada para HTML puro — revisión visual es suficiente.

---

## Task 2: Agregar estilos `.bot-info-card` (variante ámbar)

**Files:**
- Modify: `postrix-app/src/styles.css:1261` (después del bloque `.restriction-timer`)

- [ ] **Step 1: Insertar la clase CSS**

Al final del bloque de `.restriction-card` (después de línea ~1265), agrega:

```css
.bot-info-card {
  background: rgba(255, 193, 7, 0.12);
  border-color: rgba(255, 193, 7, 0.5);
  color: #ffd580;
}
.bot-info-card .restriction-card-body strong {
  color: #ffd580;
}
.bot-info-card .restriction-card-body p {
  color: rgba(255, 213, 128, 0.8);
}
```

- [ ] **Step 2: Verificar visualmente**

Arranca la app en dev (`npm run dev` o el comando equivalente del proyecto) y en la consola del renderer ejecuta:
```js
document.getElementById('bot-info-banner').classList.remove('hidden');
document.getElementById('bot-info-banner-title').textContent = 'Prueba título';
document.getElementById('bot-info-banner-msg').textContent = 'Mensaje de prueba';
```
El banner debe aparecer con fondo ámbar, encima del panel de campaña.

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/index.html postrix-app/src/styles.css
git commit -m "feat: add #bot-info-banner persistent amber alert to campaign tab"
```

---

## Task 3: Agregar strings i18n para los nuevos mensajes

**Files:**
- Modify: `postrix-app/src/renderer.js` — objeto `STR` (línea ~14 en adelante)

- [ ] **Step 1: Agregar strings en español al objeto `STR.es`**

Localiza el bloque `es: {` en el objeto `STR`. Agrega al final de las propiedades del bloque `es`, antes del cierre `}`:

```js
      bot_info_no_cookies: 'Necesitas conectar Facebook primero. Ve a Configuración y conecta tu cuenta.',
      bot_info_no_groups: 'Agrega al menos un grupo primero. Ve a la pestaña Mis Grupos.',
      bot_info_no_content: 'Agrega al menos una publicación activa. Ve a Mi Publicación.',
      bot_info_outside_hours: 'El bot publica entre {start} y {end}. Configura otro horario en Ajustes o intenta más tarde.',
      bot_info_daily_limit: 'Ya alcanzaste el límite de publicaciones de hoy. El bot se reactivará mañana.',
      bot_info_round_in_progress: 'Hay una ronda en proceso. Espera unos segundos.',
      btn_copy_diagnostics: '📋 Copiar diagnóstico',
      diag_section_title: 'Soporte',
      diag_section_sub: 'Si algo no funciona, copia el diagnóstico y envíalo al equipo de soporte.',
      toast_diagnostics_copied: 'Diagnóstico copiado. Pégalo en WhatsApp para enviarlo a soporte.',
      toast_diagnostics_error: 'No se pudo copiar el diagnóstico. Intenta de nuevo.',
```

- [ ] **Step 2: Agregar strings en inglés al objeto `STR.en`**

Localiza el bloque `en: {`. Agrega al final del bloque `en`:

```js
      bot_info_no_cookies: 'You need to connect Facebook first. Go to Settings and connect your account.',
      bot_info_no_groups: 'Add at least one group first. Go to the My Groups tab.',
      bot_info_no_content: 'Add at least one active post. Go to My Post.',
      bot_info_outside_hours: 'The bot publishes between {start} and {end}. Change the schedule in Settings or try later.',
      bot_info_daily_limit: "You've reached today's post limit. The bot will resume tomorrow.",
      bot_info_round_in_progress: 'A round is in progress. Wait a few seconds.',
      btn_copy_diagnostics: '📋 Copy diagnostics',
      diag_section_title: 'Support',
      diag_section_sub: "If something isn't working, copy the diagnostics and send to support.",
      toast_diagnostics_copied: 'Diagnostics copied. Paste in WhatsApp to send to support.',
      toast_diagnostics_error: 'Could not copy diagnostics. Try again.',
```

- [ ] **Step 3: Verificar que no hay duplicados**

Busca con grep que no exista ya ninguna de estas claves en el archivo:
```
grep -n "bot_info_no_cookies\|btn_copy_diagnostics" postrix-app/src/renderer.js
```
Debe retornar solo las líneas recién insertadas.

---

## Task 4: Agregar funciones `showBotInfoBanner` / `hideBotInfoBanner` en renderer.js

**Files:**
- Modify: `postrix-app/src/renderer.js` — insertar justo antes de `function fileUrlFromPath` (línea ~950)

- [ ] **Step 1: Insertar las dos funciones**

Busca en renderer.js la línea:
```js
  function fileUrlFromPath(p) {
```

Inmediatamente antes, agrega:

```js
  /** Banner persistente para errores de publicación no críticos (ámbar). */
  function showBotInfoBanner(title, msg) {
    const banner = document.getElementById('bot-info-banner');
    const titleEl = document.getElementById('bot-info-banner-title');
    const msgEl = document.getElementById('bot-info-banner-msg');
    if (!banner) return;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    banner.classList.remove('hidden');
  }

  function hideBotInfoBanner() {
    document.getElementById('bot-info-banner')?.classList.add('hidden');
  }

```

- [ ] **Step 2: Verificar en consola del renderer**

Arranca la app y en DevTools ejecuta:
```js
// Estas funciones existen en el scope del IIFE de renderer.js
// Para verificar, busca en Network/Sources que renderer.js cargó sin errores de sintaxis.
```
Si hay un error de sintaxis en renderer.js, la consola mostrará un `SyntaxError` en la carga. No debe haber ninguno.

---

## Task 5: Corregir `handleBotStartOrResume` — mostrar banner en lugar de fallar silenciosamente

**Files:**
- Modify: `postrix-app/src/renderer.js:1748-1781`

- [ ] **Step 1: Localizar el bloque a modificar**

En renderer.js, el bloque actual (línea ~1748) es:

```js
  async function handleBotStartOrResume() {
    const st = await api.botState();
    if (st.restrictionActive) {
      showToastWarning(
        lang === 'es'
          ? 'Facebook limitó la actividad. Espera a que termine la pausa de 24 h.'
          : 'Facebook limited activity. Wait for the 24h cooldown to end.'
      );
      return;
    }
    if (!st.paused && !st.running) {
      const data = await api.settingsGet();
      if (!canStartCampaign(data)) return;
    }
    if (st.paused) {
      const res = await api.botResume();
      if (res && res.ok === false && res.error) {
        showToastWarning(res.error);
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_resumed'));
    } else {
      const res = await api.botStart();
      if (res && res.ok === false && res.error) {
        showToastWarning(res.error);
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_started'));
    }
    refreshStats();
  }
```

- [ ] **Step 2: Reemplazar el bloque completo con la versión corregida**

```js
  async function handleBotStartOrResume() {
    const st = await api.botState();
    if (st.restrictionActive) {
      // La restriction-alert ya muestra el banner rojo persistente — solo retornar.
      return;
    }
    if (!st.paused && !st.running) {
      const data = await api.settingsGet();
      if (!canStartCampaign(data)) {
        if (!isFacebookConnected(data)) {
          showBotInfoBanner(
            lang === 'es' ? '⚠️ Facebook no conectado' : '⚠️ Facebook not connected',
            t('bot_info_no_cookies')
          );
        } else if (!(data.groups || []).length) {
          showBotInfoBanner(
            lang === 'es' ? '⚠️ Sin grupos' : '⚠️ No groups',
            t('bot_info_no_groups')
          );
        } else {
          showBotInfoBanner(
            lang === 'es' ? '⚠️ Sin publicación activa' : '⚠️ No active post',
            t('bot_info_no_content')
          );
        }
        return;
      }
    }
    hideBotInfoBanner();
    if (st.paused) {
      const res = await api.botResume();
      if (res && res.ok === false && res.error) {
        showBotInfoBanner(
          lang === 'es' ? '⚠️ No se pudo reanudar' : '⚠️ Could not resume',
          res.error
        );
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_resumed'));
    } else {
      const res = await api.botStart();
      if (res && res.ok === false && res.error) {
        if (res.reason === 'no_cookies') {
          showBotInfoBanner(
            lang === 'es' ? '⚠️ Facebook no conectado' : '⚠️ Facebook not connected',
            t('bot_info_no_cookies')
          );
        } else {
          showBotInfoBanner(
            lang === 'es' ? '⚠️ Error al iniciar' : '⚠️ Start error',
            res.error
          );
        }
        void refreshStats();
        return;
      }
      setBotStatus('running');
      logLine(t('log_bot_started'));
    }
    refreshStats();
  }
```

- [ ] **Step 3: Ocultar el banner al detener el bot**

Busca en renderer.js el handler `api.onBotStatus` (línea ~2070):

```js
  api.onBotStatus((data) => {
    if (data.status) setBotStatus(data.status);
    updateCampaignWelcomeCard();
  });
```

Reemplázalo con:

```js
  api.onBotStatus((data) => {
    if (data.status) setBotStatus(data.status);
    if (data.status === 'stopped') hideBotInfoBanner();
    updateCampaignWelcomeCard();
  });
```

- [ ] **Step 4: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "fix: show persistent banner instead of silent fail or toast on bot start errors"
```

---

## Task 6: Emitir `bot:progress` en todos los early-returns silenciosos del scheduler

**Files:**
- Modify: `postrix-app/bot/scheduler.js`

Los cambios son 5 inserciones de `progressPayload(...)` en puntos donde la función retorna sin informar al renderer.

- [ ] **Step 1: `runRound` — emitir cuando hay ronda en progreso**

Busca en scheduler.js (línea ~282):

```js
async function runRound(accountId) {
  if (runRoundInProgress) {
    console.log('[Round] ⏭️ Ronda ya en ejecución — se ignora esta llamada (sin paralelismo)');
    return;
  }
```

Reemplaza con:

```js
async function runRound(accountId) {
  if (runRoundInProgress) {
    console.log('[Round] ⏭️ Ronda ya en ejecución — se ignora esta llamada (sin paralelismo)');
    progressPayload({ status: 'round_in_progress' });
    return;
  }
```

- [ ] **Step 2: `runRoundBody` — emitir cuando no hay grupos en store**

Busca (línea ~316):

```js
  if (groupsAll.length === 0) {
    console.log('[Round] ❌ Sin grupos en store — abortando ronda');
    return;
  }
```

Reemplaza con:

```js
  if (groupsAll.length === 0) {
    console.log('[Round] ❌ Sin grupos en store — abortando ronda');
    progressPayload({ status: 'no_groups' });
    return;
  }
```

- [ ] **Step 3: `runRoundBody` — emitir cuando no hay slots activos o grupos activos elegibles**

Busca (línea ~346):

```js
  if (!activeSlots.length || !groups.length) {
    console.log('[Round] ❌ Sin slots activos con texto/imagen o sin grupos activos — abortando');
    writeLog('WARN', 'Scheduler: sin contenido o grupos activos');
    return;
  }
```

Reemplaza con:

```js
  if (!activeSlots.length || !groups.length) {
    console.log('[Round] ❌ Sin slots activos con texto/imagen o sin grupos activos — abortando');
    writeLog('WARN', 'Scheduler: sin contenido o grupos activos');
    progressPayload({
      status: activeSlots.length === 0 ? 'no_active_content' : 'no_active_groups',
    });
    return;
  }
```

- [ ] **Step 4: `runRoundBody` — emitir cuando está fuera de ventana horaria**

Busca (línea ~352):

```js
  if (!nowInWindow(rules)) {
    console.log('[Round] ❌ Fuera de ventana horaria — abortando');
    writeLog('INFO', 'Scheduler: fuera de ventana horaria');
    return;
  }
```

Reemplaza con:

```js
  if (!nowInWindow(rules)) {
    console.log('[Round] ❌ Fuera de ventana horaria — abortando');
    writeLog('INFO', 'Scheduler: fuera de ventana horaria');
    progressPayload({
      status: 'outside_hours',
      hourStart: rules.hourStart,
      hourEnd: rules.hourEnd,
    });
    return;
  }
```

- [ ] **Step 5: `runRoundBody` — emitir cuando se alcanzó el límite diario**

Busca (línea ~358):

```js
  if (!canPostToday(rules)) {
    console.log('[Round] ❌ Límite diario de publicaciones — pausando');
    writeLog('INFO', 'Scheduler: límite diario alcanzado');
    state.paused = true;
    return;
  }
```

Reemplaza con:

```js
  if (!canPostToday(rules)) {
    console.log('[Round] ❌ Límite diario de publicaciones — pausando');
    writeLog('INFO', 'Scheduler: límite diario alcanzado');
    state.paused = true;
    progressPayload({ status: 'daily_limit_reached' });
    return;
  }
```

- [ ] **Step 6: Commit**

```bash
git add postrix-app/bot/scheduler.js
git commit -m "fix: emit bot:progress for all silent scheduler early-returns"
```

---

## Task 7: Manejar los nuevos status de `bot:progress` en renderer.js

**Files:**
- Modify: `postrix-app/src/renderer.js:2075` — bloque `api.onBotProgress`

- [ ] **Step 1: Localizar el bloque del handler**

El handler actual comienza en línea ~2075:

```js
  api.onBotProgress((data) => {
    if (data.status === 'restriction_detected') {
```

- [ ] **Step 2: Agregar los nuevos casos al inicio del handler (antes del bloque existente)**

```js
  api.onBotProgress((data) => {
    if (data.status === 'outside_hours') {
      const msg = t('bot_info_outside_hours')
        .replace('{start}', data.hourStart || '09:00')
        .replace('{end}', data.hourEnd || '19:00');
      showBotInfoBanner(
        lang === 'es' ? '⏰ Fuera de horario' : '⏰ Outside active hours',
        msg
      );
      return;
    }
    if (data.status === 'daily_limit_reached') {
      showBotInfoBanner(
        lang === 'es' ? '📊 Límite diario alcanzado' : '📊 Daily limit reached',
        t('bot_info_daily_limit')
      );
      return;
    }
    if (data.status === 'no_groups') {
      showBotInfoBanner(
        lang === 'es' ? '⚠️ Sin grupos' : '⚠️ No groups',
        t('bot_info_no_groups')
      );
      return;
    }
    if (data.status === 'no_active_content' || data.status === 'no_active_groups') {
      showBotInfoBanner(
        lang === 'es' ? '⚠️ Sin publicación activa' : '⚠️ No active post',
        t('bot_info_no_content')
      );
      return;
    }
    if (data.status === 'round_in_progress') {
      showBotInfoBanner(
        lang === 'es' ? '⏳ Ronda en proceso' : '⏳ Round in progress',
        t('bot_info_round_in_progress')
      );
      return;
    }
    // Ocultar banner cuando empieza una publicación real
    if (data.status === 'posting') {
      hideBotInfoBanner();
    }
    if (data.status === 'restriction_detected') {
```

Nota: el `if (data.status === 'restriction_detected')` que ya existe en el handler NO se elimina — solo se agrega código antes de él. El resto del handler queda igual.

- [ ] **Step 3: Verificar prueba manual básica**

Con la app corriendo, abre DevTools y simula un evento de progreso:
```js
// En la consola del renderer, el IPC listener ya está registrado.
// Simula el evento emitiendo directamente desde main via DevTools Console → No es posible directamente.
// Verificación alternativa: inicia el bot con el horario cambiado a una hora pasada (ej. hourEnd = 01:00)
// y observa que aparece el banner ámbar con "Fuera de horario".
```

- [ ] **Step 4: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "feat: handle outside_hours, daily_limit, no_groups, round_in_progress in renderer banner"
```

---

## Task 8: Agregar handler IPC `diagnostics:collect` en main.js

**Files:**
- Modify: `postrix-app/main.js`

- [ ] **Step 1: Importar `getHardwareIdSync` al inicio de main.js**

Busca en main.js la sección de imports. Actualmente no importa de `hardwareId.js`. Agrega la siguiente línea al bloque de imports del bot (junto a las importaciones de `scheduler.js` y `facebook.js`):

```js
import { getHardwareIdSync } from './bot/hardwareId.js';
```

La ubicación exacta: después de la línea que importa desde `./bot/scheduler.js`:
```js
import {
  startScheduler,
  pauseScheduler,
  resumeScheduler,
  stopScheduler,
  getSchedulerState,
  getFacebookRestrictionBlockInfo,
} from './bot/scheduler.js';
```

Agrega debajo:
```js
import { getHardwareIdSync } from './bot/hardwareId.js';
```

- [ ] **Step 2: Agregar el handler IPC al final del bloque `app.whenReady()`**

Busca en main.js el handler `ipcMain.handle('bot:state', ...)` (línea ~568):

```js
  ipcMain.handle('bot:state', () => getSchedulerState());
```

Inmediatamente después, agrega:

```js
  ipcMain.handle('diagnostics:collect', async () => {
    try {
      const store = getStore();
      const schedulerSt = getSchedulerState();
      const groups = store.get('groups') || [];

      // Verificar si hay cookies válidas de Facebook
      const rawCookies = store.get('fb_session_cookies');
      let hasFacebookCookies = false;
      if (rawCookies && typeof rawCookies === 'string' && rawCookies.length > 10) {
        try {
          const parsed = JSON.parse(rawCookies);
          hasFacebookCookies = Array.isArray(parsed) && parsed.length > 0;
        } catch { /* cookies corruptas */ }
      }

      // Última publicación exitosa
      const history = store.get('history') || [];
      const lastOk = history.find((h) => h.result === 'ok');

      // Horario configurado
      const rules = store.get('rules') || {};
      const campaignSession = store.get('campaign')?.session || {};

      // Estado del bot
      let botStatus = 'Detenido';
      if (schedulerSt.running && schedulerSt.paused) botStatus = 'Pausado';
      else if (schedulerSt.running) botStatus = 'Activo';

      // Últimas 50 líneas del log
      let logLines = '(sin logs disponibles)';
      try {
        const logPath = getLogFilePath();
        if (logPath && fs.existsSync(logPath)) {
          const raw = fs.readFileSync(logPath, 'utf8');
          const lines = raw.split('\n').filter(Boolean);
          logLines = lines.slice(-50).join('\n');
        }
      } catch (err) {
        logLines = `(error leyendo log: ${err.message})`;
      }

      return {
        appVersion: process.env.APP_VERSION || '1.0.0',
        hardwareId: getHardwareIdSync(),
        botStatus,
        hasFacebookCookies,
        groupsCount: groups.length,
        lastSuccessfulPost: lastOk ? lastOk.at : 'Ninguna',
        hourStart: rules.hourStart || campaignSession.hourStart || '09:00',
        hourEnd: rules.hourEnd || campaignSession.hourEnd || '19:00',
        currentDateTime: new Date().toISOString(),
        logLines,
      };
    } catch (err) {
      writeLog('ERROR', '[diagnostics:collect] falló', { message: err.message });
      return { error: err.message };
    }
  });
```

- [ ] **Step 3: Verificar que `fs` ya está importado**

Al inicio de main.js, confirma que existe la línea:
```js
import fs from 'fs';
```
Esta importación ya existe en el archivo (línea ~8). No hay que agregarla.

- [ ] **Step 4: Commit**

```bash
git add postrix-app/main.js
git commit -m "feat: add diagnostics:collect IPC handler with log tail and hw ID"
```

---

## Task 9: Exponer `collectDiagnostics` en preload.cjs

**Files:**
- Modify: `postrix-app/preload.cjs`

- [ ] **Step 1: Agregar la exposición del nuevo canal IPC**

En `preload.cjs`, busca la última línea expuesta (actualmente `installUpdate`):

```js
  /** Reinicia e instala la actualización descargada. */
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
```

Agrega inmediatamente después (antes del `}`):

```js
  /** Recopila diagnóstico del sistema para soporte. */
  collectDiagnostics: () => ipcRenderer.invoke('diagnostics:collect'),
```

- [ ] **Step 2: Verificar que el bridge queda correcto**

El archivo debe terminar así:
```js
  collectDiagnostics: () => ipcRenderer.invoke('diagnostics:collect'),
});
```

- [ ] **Step 3: Commit**

```bash
git add postrix-app/preload.cjs
git commit -m "feat: expose collectDiagnostics via contextBridge"
```

---

## Task 10: Agregar botón "Copiar diagnóstico" al HTML de Ajustes

**Files:**
- Modify: `postrix-app/src/index.html:317-351`

- [ ] **Step 1: Insertar el bloque de diagnóstico antes de `#btn-save-settings`**

En el tab `#tab-settings`, busca:

```html
          <input type="hidden" id="campaign-name" value="" />

          <button id="btn-save-settings" class="btn btn-primary" type="button" data-i18n="btn_save">Guardar configuración</button>
```

Inserta entre esas dos líneas el bloque del diagnóstico:

```html
          <div class="settings-block card-elevated">
            <h2 class="settings-block-title" data-i18n="diag_section_title">Soporte</h2>
            <p class="muted settings-block-sub" data-i18n="diag_section_sub">Si algo no funciona, copia el diagnóstico y envíalo al equipo de soporte.</p>
            <button id="btn-copy-diagnostics" class="btn btn-secondary" type="button" data-i18n="btn_copy_diagnostics">📋 Copiar diagnóstico</button>
          </div>

```

- [ ] **Step 2: Commit parcial**

```bash
git add postrix-app/src/index.html
git commit -m "feat: add diagnostics copy button to Settings tab"
```

---

## Task 11: Implementar el handler del botón diagnóstico en renderer.js

**Files:**
- Modify: `postrix-app/src/renderer.js`

- [ ] **Step 1: Agregar la función `showToastInfo` (verde, para confirmación de copia)**

Busca la función `showToastWarning` (línea ~937). Inmediatamente después, agrega:

```js
  /** Toast verde para confirmaciones (p. ej. diagnóstico copiado). */
  function showToastInfo(message) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.innerHTML = `<div class="toast-title">${escapeHtml(message)}</div>`;
    stack.insertBefore(el, stack.firstChild);
    setTimeout(() => {
      el.classList.add('toast-notification--out');
      setTimeout(() => el.remove(), 350);
    }, 3500);
  }
```

- [ ] **Step 2: Agregar la función `formatDiagnostics`**

Justo después de `showToastInfo`, agrega:

```js
  /** Formatea el objeto de diagnóstico como texto plano para copiar al portapapeles. */
  function formatDiagnostics(d) {
    if (d.error) {
      return `=== POSTRIX DIAGNÓSTICO ===\nError al recopilar: ${d.error}\n===========================`;
    }
    return [
      '=== POSTRIX DIAGNÓSTICO ===',
      `Versión app: ${d.appVersion}`,
      `Hardware ID: ${d.hardwareId}`,
      `Estado bot: ${d.botStatus}`,
      `Facebook conectado: ${d.hasFacebookCookies ? 'Sí' : 'No'}`,
      `Grupos agregados: ${d.groupsCount}`,
      `Última publicación exitosa: ${d.lastSuccessfulPost}`,
      `Horario configurado: ${d.hourStart} – ${d.hourEnd}`,
      `Fecha/hora del PC: ${d.currentDateTime}`,
      '',
      '--- ÚLTIMAS 50 LÍNEAS DE LOG ---',
      d.logLines || '(sin logs)',
      '================================',
    ].join('\n');
  }
```

- [ ] **Step 3: Agregar el event listener del botón**

Busca en renderer.js el handler del botón de guardar ajustes:
```js
  document.getElementById('btn-save-settings').onclick = () => saveRulesFromForm();
```

Inmediatamente después, agrega:

```js
  document.getElementById('btn-copy-diagnostics')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-diagnostics');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Recopilando...'; }
    try {
      const diag = await api.collectDiagnostics();
      const text = formatDiagnostics(diag);
      await navigator.clipboard.writeText(text);
      showToastInfo(t('toast_diagnostics_copied'));
    } catch {
      showToastWarning(t('toast_diagnostics_error'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = t('btn_copy_diagnostics');
      }
    }
  });
```

- [ ] **Step 4: Asegurarse de que el botón actualiza su texto con i18n al cambiar de idioma**

Busca en renderer.js la función `applyI18n` (o donde se actualiza el texto de los botones vía `data-i18n`). El botón usa `data-i18n="btn_copy_diagnostics"`, así que si `applyI18n` recorre todos los elementos con ese atributo ya funcionará. Verifica que `applyI18n` usa `document.querySelectorAll('[data-i18n]')`. Si no lo hace, el texto inicial en HTML ("📋 Copiar diagnóstico") ya servirá de fallback.

- [ ] **Step 5: Commit final**

```bash
git add postrix-app/src/renderer.js
git commit -m "feat: diagnostics copy button with formatted clipboard output and toast"
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|---|---|
| Sin cookies → banner "Necesitas conectar Facebook" | Task 5 (handleBotStartOrResume) |
| Cookies inválidas/expiradas → banner azul ya existente | Ya funciona vía `session_expired`; verificado en análisis |
| Fuera de horario → banner con horas | Task 6 (scheduler) + Task 7 (renderer handler) |
| Restricción Facebook → mensaje con countdown | Ya funciona (`restriction-alert`); Task 5 elimina el toast duplicado |
| Sin grupos → banner | Task 5 + 6 + 7 |
| Límite diario → banner | Task 6 + 7 |
| runRoundInProgress → banner | Task 6 + 7 |
| Botón "📋 Copiar diagnóstico" en Ajustes | Task 10 |
| Versión app en diagnóstico | Task 8 |
| Hardware ID en diagnóstico | Task 8 |
| Estado bot en diagnóstico | Task 8 |
| Cookies FB (sí/no) | Task 8 |
| Grupos agregados | Task 8 |
| Última publicación exitosa | Task 8 |
| Últimas 50 líneas de log | Task 8 |
| Horario configurado | Task 8 |
| Fecha/hora actual | Task 8 |
| Toast "Diagnóstico copiado..." | Task 11 |
| Banners persistentes (no toasts) | Todos los tasks de renderer usan `showBotInfoBanner` |

### Notas de tipo / consistencia

- `getHardwareIdSync()` se usa en Task 8 (no la versión async que hace HTTP). Esto es correcto: es rápido y no bloquea el handler IPC.
- `progressPayload` en scheduler.js ya existe y funciona correctamente — solo se agrega en puntos donde no se llamaba.
- `hideBotInfoBanner()` se llama en dos lugares: cuando el bot se detiene (`onBotStatus stopped`) y cuando comienza a publicar en un grupo (`posting`). Esto garantiza que el banner desaparece cuando el problema se resuelve.
- El botón diagnóstico usa `?. addEventListener` para no romper si el DOM aún no cargó, aunque en la práctica el renderer.js se ejecuta después de que el DOM está listo.

---

**Plan completo guardado.** ¿Cómo quieres ejecutarlo?

**1. Subagent-Driven (recomendado)** — Despacho un subagente fresco por task, reviso entre tasks, iteración rápida

**2. Inline Execution** — Ejecuto los tasks en esta sesión con checkpoints de revisión

**¿Cuál prefieres?**
