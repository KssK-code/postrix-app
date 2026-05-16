# Onboarding Helpers Permanentes (Tooltips, Status Card, FAQ) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar al onboarding tres mejoras permanentes (siempre visibles, no solo en el primer arranque): (a) ícono `?` con tooltips en los campos de configuración confusos, (b) tarjeta de estado en lenguaje simple en "Mi Campaña" que explica qué está haciendo el bot, y (c) modal de ayuda flotante con FAQ de 10 preguntas + atajo a "Copiar diagnóstico".

**Architecture:**
- HTML puro + DOM vanilla. Sin frameworks. Sin librerías nuevas.
- Tooltips: HTML inline `<span class="help-tooltip">?<span class="help-tooltip-bubble">…</span></span>` que reutiliza el patrón CSS existente (`.tooltip-container`/`.tooltip-text`) ligeramente personalizado al color cyan `var(--accent2)` (#00D4FF). Hover-only + tap en móvil; no JS necesario.
- Status card: un `<div id="campaign-status-card">` siempre visible al inicio del panel de campaña, que se re-renderiza cada segundo desde `refreshStats(...)` (el ciclo existente que ya consulta `botState()` y el store cada 1 s). Decide su variante (verde/amarillo/rojo/gris) con una función pura `pickCampaignStatus(botSt, data)` que solo lee datos ya disponibles (sin nueva IPC).
- FAQ + modal de ayuda: botón fijo abajo-derecha `#btn-help-float` que abre `#modal-help` reutilizando el patrón `.modal/.modal-backdrop/.modal-card` ya usado en `#modal-search`. La FAQ es 10 `<details>` nativos (sin librería). El botón "Copiar diagnóstico" del modal invoca exactamente la misma función que el de Ajustes (DRY: extraer a `runCopyDiagnostics()`).

**Tech Stack:** Electron (renderer puro), `<details>/<summary>` nativos para acordeones, CSS variables del proyecto (`--accent2`, `--surface`, `--text-muted`), strings i18n vía objeto `STR` en `renderer.js`. No se modifica `main.js`, `preload.cjs`, `scheduler.js` ni nada del proceso principal — todo es UI.

---

## Mapa de archivos

| Archivo | Acción | Qué cambia |
|---|---|---|
| `postrix-app/src/index.html` | Modificar | (a) Iconos `?` con tooltips junto a 6 campos. (b) Tarjeta `#campaign-status-card` permanente al inicio de Mi Campaña. (c) Botón flotante `#btn-help-float` + modal `#modal-help` con 10 acordeones FAQ. |
| `postrix-app/src/styles.css` | Modificar | (a) `.help-tooltip` + `.help-tooltip-bubble` (variante cyan, 14 px, click-to-open en touch). (b) `.campaign-status-card` con modificadores `--ok / --waiting / --warn / --error / --paused`. (c) `.help-fab` (botón flotante), `.modal-help-card`, `.faq-list`, `.faq-item`. |
| `postrix-app/src/renderer.js` | Modificar | (a) Strings i18n nuevas (es/en) para tooltips, status-card, FAQ y modal. (b) Función `pickCampaignStatus(botSt, data)` y `renderCampaignStatusCard(botSt, data)`. Hook en `refreshStats`. (c) Función `runCopyDiagnostics(buttonEl, originalLabel)` extraída del handler actual; handlers para abrir/cerrar `#modal-help`, para el botón flotante y para "Copiar diagnóstico" dentro del modal. |

**Archivos que NO se tocan:** `main.js`, `preload.cjs`, `bot/*.js`, `package.json`. Todo el cambio vive en el renderer.

---

## Self-test sin framework

El proyecto no tiene Jest/Vitest. Las verificaciones de cada task son **manuales en DevTools de Electron** (`npm run dev`). Cada task incluye un snippet `js> …` que puede pegarse en la consola del renderer para validar la conducta esperada antes de pasar al siguiente paso.

Si más adelante quieren añadir un test runner, las funciones puras `pickCampaignStatus(botSt, data)` y `formatStatusTime(date, lang)` son las únicas con lógica testeable de verdad — están escritas de forma que pueden extraerse sin tocar el DOM.

---

## Task 1: Strings i18n nuevas (es + en)

Todos los textos visibles de PART 4/5/6 entran al objeto `STR` en `renderer.js` para mantener el patrón bilingüe ya establecido. Esta task NO toca DOM, solo cadenas.

**Files:**
- Modify: `postrix-app/src/renderer.js` — bloque `STR.es` (línea ~14) y `STR.en` (línea ~302)

- [ ] **Step 1: Agregar strings al bloque `STR.es`**

Localiza en `renderer.js` la última propiedad del bloque `es` (actualmente `toast_diagnostics_error: 'No se pudo copiar el diagnóstico. Intenta de nuevo.',` línea ~300). Inserta antes del cierre `},`:

```js
      // —— Tooltips de ayuda (PART 4) ——
      tip_interval: 'Tiempo entre rondas. Recomendado: 2-3 horas.',
      tip_until: 'Hora a la que el bot deja de publicar.',
      tip_groups_per_round: 'Grupos por vuelta. Empieza con 20.',
      tip_fb_connect: 'Necesario para que el bot pueda publicar.',
      tip_search_groups: 'Encuentra grupos por palabras clave.',
      tip_add_by_link: 'Pega la URL directa de un grupo.',
      tip_aria_label: 'Ayuda sobre este campo',
      // —— Tarjeta de estado "¿Qué está pasando?" (PART 5) ——
      status_card_title: '¿Qué está pasando?',
      status_running_just_posted: '🟢 Bot activo. Publicó en {n} grupos en la última ronda. Próxima ronda en {delay} (a las {clock})',
      status_running_just_posted_zero: '🟢 Bot activo. La última ronda no encontró grupos disponibles. Próxima ronda en {delay} (a las {clock})',
      status_running_waiting_hours: '🟡 Bot esperando. Empezará a las {clock}',
      status_running_pre_first_round: '🟡 Bot activo. La primera ronda iniciará en breve',
      status_stopped_session_expired: '🔴 Bot detenido: tu sesión de Facebook expiró. Reconéctala en Configuración',
      status_stopped_restriction: '🔴 Bot detenido por Facebook. Reanudará en {delay}',
      status_stopped_voluntary: '⏸️ Bot pausado. Dale a INICIAR cuando quieras reanudar',
      status_paused_user: '⏸️ Bot pausado. Dale a REANUDAR cuando quieras continuar',
      status_idle_not_started: '⚪ Bot detenido. Configura tu campaña y presiona INICIAR',
      // —— Modal de ayuda + FAQ (PART 6) ——
      help_fab_label: 'Ayuda',
      help_fab_aria: 'Abrir centro de ayuda',
      help_modal_title: 'Centro de ayuda',
      help_modal_intro: 'Aquí están las respuestas a las preguntas más comunes. Si no encuentras lo que buscas, copia el diagnóstico abajo y mándalo por WhatsApp para que te ayudemos.',
      faq_section_title: 'Preguntas frecuentes',
      faq_q1: '¿Por qué el bot no publica?',
      faq_a1: 'Revisa que tengas Facebook conectado, al menos un grupo agregado y una versión de publicación activa. También verifica que estés dentro del horario configurado.',
      faq_q2: '¿Por qué algunos grupos aparecen en rojo o naranja?',
      faq_a2: 'Rojo significa que no eres miembro o el grupo no está disponible. Naranja significa "solo compraventa": el grupo no permite publicaciones de texto y el bot lo salta.',
      faq_q3: '¿Cómo cambio el horario de publicación?',
      faq_a3: 'Ve a Mi Campaña → Configuración rápida y cambia "¿Hasta qué hora publicar hoy?". El bot deja de publicar a esa hora.',
      faq_q4: '¿Qué hago si Facebook me marca restricción?',
      faq_a4: 'El bot se pausa automáticamente 24 horas para proteger tu cuenta. Espera a que termine la pausa; verás un contador en Mi Campaña. No publiques manualmente durante esa pausa.',
      faq_q5: '¿Qué significa "Solicitud pendiente" en un grupo?',
      faq_a5: 'Aún no eres miembro: enviaste solicitud y el admin no la aprueba. El bot saltará ese grupo hasta que entres. Puedes darle "Ver grupo" para revisarlo en Facebook.',
      faq_q6: '¿Cómo agrego más grupos?',
      faq_a6: 'Ve a Mis Grupos y usa "Buscar grupos por tema" o "Agregar grupo por link". El máximo son 80 grupos por campaña.',
      faq_q7: '¿Puedo cambiar el mensaje mientras el bot está corriendo?',
      faq_a7: 'Sí. Ve a Mi Publicación, edita la versión y guarda. El bot tomará el mensaje nuevo en la siguiente ronda. Las publicaciones ya hechas no se modifican.',
      faq_q8: '¿Qué hago si la app se cierra sola?',
      faq_a8: 'Vuelve a abrirla; el bot recuerda tu progreso y configuración. Si te pasa seguido, copia el diagnóstico abajo y mándalo por WhatsApp.',
      faq_q9: '¿Cuántas publicaciones hace al día?',
      faq_a9: 'Depende del intervalo, los grupos y el horario. Con 20 grupos por ronda cada 2 horas en horario 9-19, son ~10 rondas al día. Facebook puede limitar publicaciones repetitivas.',
      faq_q10: '¿Qué hago si nada funciona?',
      faq_a10: 'Dale clic a "Copiar diagnóstico" abajo y mándalo por WhatsApp para que te ayudemos.',
      help_copy_diagnostics_hint: 'Si nada de arriba resolvió tu problema, manda esto al soporte:',
```

- [ ] **Step 2: Agregar strings al bloque `STR.en`**

Localiza la última propiedad del bloque `en` (`toast_diagnostics_error: 'Could not copy diagnostics. Try again.',` línea ~580). Inserta antes del cierre `},`:

```js
      // —— Help tooltips (PART 4) ——
      tip_interval: 'Time between rounds. Recommended: 2-3 hours.',
      tip_until: 'Time when the bot stops posting.',
      tip_groups_per_round: 'Groups per round. Start with 20.',
      tip_fb_connect: 'Required for the bot to be able to post.',
      tip_search_groups: 'Find groups by keywords.',
      tip_add_by_link: 'Paste the direct URL of a group.',
      tip_aria_label: 'Help about this field',
      // —— Status card "What's happening?" (PART 5) ——
      status_card_title: "What's happening?",
      status_running_just_posted: '🟢 Bot active. Posted in {n} groups last round. Next round in {delay} (at {clock})',
      status_running_just_posted_zero: '🟢 Bot active. Last round found no available groups. Next round in {delay} (at {clock})',
      status_running_waiting_hours: '🟡 Bot waiting. Will start at {clock}',
      status_running_pre_first_round: '🟡 Bot active. First round will start shortly',
      status_stopped_session_expired: '🔴 Bot stopped: your Facebook session expired. Reconnect it in Settings',
      status_stopped_restriction: '🔴 Bot stopped by Facebook. Will resume in {delay}',
      status_stopped_voluntary: '⏸️ Bot paused. Press START whenever you want to resume',
      status_paused_user: '⏸️ Bot paused. Press RESUME whenever you want to continue',
      status_idle_not_started: '⚪ Bot stopped. Configure your campaign and press START',
      // —— Help modal + FAQ (PART 6) ——
      help_fab_label: 'Help',
      help_fab_aria: 'Open help center',
      help_modal_title: 'Help center',
      help_modal_intro: "Here are answers to the most common questions. If you can't find what you're looking for, copy the diagnostics below and send it via WhatsApp so we can help.",
      faq_section_title: 'Frequently asked questions',
      faq_q1: "Why isn't the bot posting?",
      faq_a1: 'Check that Facebook is connected, at least one group is added, and one post version is active. Also make sure you are within the configured schedule.',
      faq_q2: 'Why do some groups appear in red or orange?',
      faq_a2: "Red means you're not a member or the group is unavailable. Orange means \"buy-sell only\": that group does not allow text posts and the bot skips it.",
      faq_q3: 'How do I change the posting schedule?',
      faq_a3: 'Go to My Campaign → Quick setup and change "Until what time today?". The bot stops posting at that time.',
      faq_q4: 'What do I do if Facebook flags a restriction?',
      faq_a4: 'The bot pauses automatically for 24 hours to protect your account. Wait for the pause to end; you will see a countdown in My Campaign. Do not post manually during that pause.',
      faq_q5: 'What does "Pending request" on a group mean?',
      faq_a5: "You aren't a member yet: you sent a request and the admin hasn't approved it. The bot will skip that group until you're in. You can press \"View group\" to check it on Facebook.",
      faq_q6: 'How do I add more groups?',
      faq_a6: 'Go to My Groups and use "Search groups by topic" or "Add group by link". The maximum is 80 groups per campaign.',
      faq_q7: 'Can I change the message while the bot is running?',
      faq_a7: 'Yes. Go to My Post, edit the version and save. The bot will take the new message on the next round. Posts already made are not modified.',
      faq_q8: 'What do I do if the app closes by itself?',
      faq_a8: 'Open it again; the bot remembers your progress and configuration. If it happens often, copy the diagnostics below and send it via WhatsApp.',
      faq_q9: 'How many posts does it make per day?',
      faq_a9: 'Depends on the interval, groups and schedule. With 20 groups per round every 2 hours in a 9-19 schedule, that is ~10 rounds per day. Facebook may limit repetitive posts.',
      faq_q10: 'What do I do if nothing works?',
      faq_a10: 'Click "Copy diagnostics" below and send it via WhatsApp so we can help.',
      help_copy_diagnostics_hint: 'If nothing above solved your issue, send this to support:',
```

- [ ] **Step 3: Verificar que no hay duplicados ni typos**

Ejecuta:
```bash
grep -c "tip_interval\|status_card_title\|faq_q1\|help_modal_title" postrix-app/src/renderer.js
```
Debe imprimir `8` (cuatro claves × dos idiomas).

- [ ] **Step 4: Verificar carga sin errores de sintaxis**

Arranca la app (`npm run dev`). En DevTools del renderer no debe aparecer ningún `SyntaxError`. En la consola ejecuta:
```js
> window.postrix !== undefined
true
```
Si el IIFE de `renderer.js` falló al parsear, `window.postrix` seguiría existiendo (lo expone preload) pero los listeners no se conectarían — comprueba que los tabs siguen cambiando al hacer click.

- [ ] **Step 5: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "feat(i18n): add strings for tooltips, status card and help modal FAQ"
```

---

## Task 2: CSS — Ícono `?` cyan + burbuja de tooltip

Añade un nuevo bloque CSS dedicado a los tooltips de ayuda (sin tocar `.tooltip-container` ya existente, que sigue en uso por otros módulos). La nueva clase `.help-tooltip` cumple lo que pide PART 4: color cyan `#00D4FF`, 14 px, posición flexible.

**Files:**
- Modify: `postrix-app/src/styles.css` — insertar al final del archivo (línea ~1980, después de `.tooltip-container { … }`)

- [ ] **Step 1: Insertar el bloque CSS de tooltips de ayuda**

Localiza el final del bloque `.tooltip-container:hover .tooltip-text, .tooltip-container:focus-within .tooltip-text { visibility: visible; }` (línea ~1978). Inmediatamente después, agrega:

```css
/* —— Tooltips de ayuda contextual (PART 4) —— */
.help-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--accent2);
  background: rgba(0, 212, 255, 0.12);
  border: 1px solid rgba(0, 212, 255, 0.5);
  border-radius: 50%;
  cursor: help;
  user-select: none;
  vertical-align: middle;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.help-tooltip:hover,
.help-tooltip:focus-visible {
  background: rgba(0, 212, 255, 0.22);
  outline: none;
  transform: scale(1.06);
}

.help-tooltip-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #cbd2e8;
  background: #1a1f35;
  border: 1px solid #2a3050;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  text-align: left;
  white-space: normal;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.12s ease, visibility 0.12s ease;
  z-index: 90;
}

.help-tooltip-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1a1f35;
}

.help-tooltip:hover .help-tooltip-bubble,
.help-tooltip:focus-visible .help-tooltip-bubble,
.help-tooltip.is-open .help-tooltip-bubble {
  visibility: visible;
  opacity: 1;
}

/* En la barra superior derecha del campo "hora fin": que el tooltip
   no rompa el flex del label */
.campaign-quick-label .help-tooltip {
  vertical-align: middle;
}

/* Variante de posición: cuando el tooltip está cerca del borde derecho,
   se ancla a la izquierda en vez de centrado */
.help-tooltip--right .help-tooltip-bubble {
  left: auto;
  right: -4px;
  transform: none;
}

.help-tooltip--right .help-tooltip-bubble::after {
  left: auto;
  right: 8px;
  transform: none;
}
```

- [ ] **Step 2: Verificar visualmente en DevTools**

Arranca `npm run dev`. En la consola del renderer:
```js
> const el = document.createElement('span');
> el.className = 'help-tooltip';
> el.tabIndex = 0;
> el.textContent = '?';
> const b = document.createElement('span');
> b.className = 'help-tooltip-bubble';
> b.textContent = 'Texto de prueba.';
> el.appendChild(b);
> document.querySelector('.campaign-quick').prepend(el);
```
Debe verse un círculo cyan de 16 × 16 con un signo `?` blanco-cyan. Al hacer hover, aparece la burbuja oscura arriba con el texto.

Limpia con:
```js
> document.querySelector('.campaign-quick .help-tooltip').remove();
```

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/styles.css
git commit -m "feat(ui): add cyan help tooltip styles (.help-tooltip + bubble)"
```

---

## Task 3: HTML — Insertar 6 tooltips `?` en sus campos (PART 4)

Cada tooltip es exactamente la misma estructura mínima. Reutilizamos `data-i18n` para el texto de la burbuja (clave del Task 1) y `aria-label` para accesibilidad.

**Files:**
- Modify: `postrix-app/src/index.html` — líneas 138, 147, 151, 219, 218, 338

- [ ] **Step 1: Tooltip junto a "¿Cada cuánto publicar?"**

Localiza (línea ~138):
```html
              <p class="campaign-quick-label" data-i18n="cq_interval">¿Cada cuánto publicar?</p>
```

Sustituye por:
```html
              <p class="campaign-quick-label"><span data-i18n="cq_interval">¿Cada cuánto publicar?</span><span class="help-tooltip" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_interval">Tiempo entre rondas. Recomendado: 2-3 horas.</span></span></p>
```

- [ ] **Step 2: Tooltip junto a "¿Hasta qué hora publicar hoy?"**

Localiza (línea ~147):
```html
              <label class="campaign-quick-label" for="cq-hour-end" data-i18n="cq_until">¿Hasta qué hora publicar hoy?</label>
```

Sustituye por:
```html
              <label class="campaign-quick-label" for="cq-hour-end"><span data-i18n="cq_until">¿Hasta qué hora publicar hoy?</span><span class="help-tooltip" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_until">Hora a la que el bot deja de publicar.</span></span></label>
```

- [ ] **Step 3: Tooltip junto a "¿En cuántos grupos por ronda?"**

Localiza (línea ~151):
```html
              <p class="campaign-quick-label" data-i18n="cq_round">¿En cuántos grupos por ronda?</p>
```

Sustituye por:
```html
              <p class="campaign-quick-label"><span data-i18n="cq_round">¿En cuántos grupos por ronda?</span><span class="help-tooltip" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_groups_per_round">Grupos por vuelta. Empieza con 20.</span></span></p>
```

- [ ] **Step 4: Tooltip junto a "Conectar mi cuenta de Facebook"**

Localiza (línea ~338):
```html
                <button id="btn-fb-connect" class="btn btn-primary" type="button" data-i18n="btn_connect_fb_big">🔗 Conectar mi cuenta de Facebook</button>
```

Sustituye por (envuelve el botón en un wrapper y agrega el tooltip a su derecha):
```html
                <div class="btn-with-tooltip">
                  <button id="btn-fb-connect" class="btn btn-primary" type="button" data-i18n="btn_connect_fb_big">🔗 Conectar mi cuenta de Facebook</button>
                  <span class="help-tooltip help-tooltip--right" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_fb_connect">Necesario para que el bot pueda publicar.</span></span>
                </div>
```

- [ ] **Step 5: Tooltips junto a "Buscar grupos por tema" y "Agregar grupo por link"**

Localiza (línea ~217-219):
```html
          <div class="row-btns groups-main-actions">
            <button id="btn-search-groups" class="btn btn-primary btn-lg" type="button" data-i18n="btn_search_groups_big">🔍 Buscar grupos por tema</button>
            <button id="btn-focus-links" class="btn btn-secondary btn-lg" type="button" data-i18n="btn_add_by_link">🔗 Agregar grupo por link</button>
          </div>
```

Sustituye por:
```html
          <div class="row-btns groups-main-actions">
            <div class="btn-with-tooltip">
              <button id="btn-search-groups" class="btn btn-primary btn-lg" type="button" data-i18n="btn_search_groups_big">🔍 Buscar grupos por tema</button>
              <span class="help-tooltip help-tooltip--right" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_search_groups">Encuentra grupos por palabras clave.</span></span>
            </div>
            <div class="btn-with-tooltip">
              <button id="btn-focus-links" class="btn btn-secondary btn-lg" type="button" data-i18n="btn_add_by_link">🔗 Agregar grupo por link</button>
              <span class="help-tooltip help-tooltip--right" tabindex="0" role="button" data-i18n-aria-label="tip_aria_label" aria-label="Ayuda sobre este campo">?<span class="help-tooltip-bubble" data-i18n="tip_add_by_link">Pega la URL directa de un grupo.</span></span>
            </div>
          </div>
```

- [ ] **Step 6: Agregar `.btn-with-tooltip` y soporte `data-i18n-aria-label` al CSS**

Al final de `postrix-app/src/styles.css`, justo después del bloque CSS añadido en Task 2, agrega:
```css
.btn-with-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-with-tooltip .btn {
  flex: 1 1 auto;
}
```

- [ ] **Step 7: Soporte i18n del atributo `aria-label`**

En `renderer.js`, localiza la función `applyI18n` (línea ~588). El bloque actual:
```js
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (STR[lang][k]) el.textContent = STR[lang][k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (STR[lang][k]) el.setAttribute('placeholder', STR[lang][k]);
    });
  }
```

Reemplázalo por:
```js
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (STR[lang][k]) el.textContent = STR[lang][k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (STR[lang][k]) el.setAttribute('placeholder', STR[lang][k]);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const k = el.getAttribute('data-i18n-aria-label');
      if (STR[lang][k]) el.setAttribute('aria-label', STR[lang][k]);
    });
  }
```

- [ ] **Step 8: Verificación manual**

Arranca `npm run dev`. Verifica:
1. En **Mi Campaña** → "Configuración rápida": los tres labels muestran un `?` cyan a la derecha. Hover en cualquiera abre la burbuja con el texto correcto.
2. En **Mis Grupos**: los dos botones grandes (`🔍 Buscar grupos…` y `🔗 Agregar grupo…`) muestran un `?` cyan a la derecha.
3. En **Configuración**: el botón `🔗 Conectar mi cuenta de Facebook` muestra un `?` cyan a la derecha. Hover funciona.
4. Cambia idioma con el botón "ES / EN" del header. Los textos de las burbujas cambian al idioma activo.
5. Tab-navega con teclado: cada `?` recibe foco visible (outline cyan), y la burbuja aparece al recibir foco.

- [ ] **Step 9: Commit**

```bash
git add postrix-app/src/index.html postrix-app/src/styles.css postrix-app/src/renderer.js
git commit -m "feat(onboarding): add cyan help tooltips on 6 confusing config fields"
```

---

## Task 4: HTML — Tarjeta de estado siempre visible (PART 5)

La tarjeta vive al inicio del panel de campaña, después de los banners de restricción/sesión expirada pero antes de "Configuración rápida". Por defecto está vacía; `renderCampaignStatusCard(...)` la llena en cada tick.

**Files:**
- Modify: `postrix-app/src/index.html` — entre línea ~132 y ~134 (después del cierre del `#bot-info-banner` y antes del comentario `<!-- 1. Configuración rápida (sesión) -->`)

- [ ] **Step 1: Insertar el bloque de la tarjeta**

Localiza:
```html
          <!-- Banner informativo: fuera de horario, sin grupos, etc. -->
          <div id="bot-info-banner" class="restriction-card bot-info-card hidden" role="alert">
            <span class="restriction-card-emoji" aria-hidden="true">⚠️</span>
            <div class="restriction-card-body">
              <strong id="bot-info-banner-title"></strong>
              <p id="bot-info-banner-msg"></p>
            </div>
          </div>

          <!-- 1. Configuración rápida (sesión) -->
```

Inserta entre el `</div>` del banner y el comentario:
```html

          <!-- Tarjeta de estado en lenguaje simple (PART 5) — siempre visible -->
          <div id="campaign-status-card" class="campaign-status-card campaign-status-card--idle" role="status" aria-live="polite">
            <p class="campaign-status-card-label" data-i18n="status_card_title">¿Qué está pasando?</p>
            <p id="campaign-status-card-msg" class="campaign-status-card-msg"></p>
          </div>
```

- [ ] **Step 2: Verificar que el HTML compila**

Abre `index.html` y comprueba que las etiquetas estén balanceadas. No hay test automatizado para HTML estático — basta con que la app arranque sin errores en consola.

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/index.html
git commit -m "feat(ui): add permanent campaign status card to Mi Campaña"
```

---

## Task 5: CSS — Estilos de la tarjeta de estado

**Files:**
- Modify: `postrix-app/src/styles.css` — al final del archivo, después de los estilos `.btn-with-tooltip` añadidos en Task 3

- [ ] **Step 1: Insertar los estilos**

```css
/* —— Tarjeta "¿Qué está pasando?" (PART 5) —— */
.campaign-status-card {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--surface);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.campaign-status-card-label {
  margin: 0 0 4px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.campaign-status-card-msg {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--text);
}

.campaign-status-card--idle {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.campaign-status-card--ok {
  border-color: rgba(0, 200, 150, 0.4);
  background: rgba(0, 200, 150, 0.06);
}

.campaign-status-card--ok .campaign-status-card-msg {
  color: #b7f0dc;
}

.campaign-status-card--waiting {
  border-color: rgba(255, 217, 61, 0.4);
  background: rgba(255, 217, 61, 0.06);
}

.campaign-status-card--waiting .campaign-status-card-msg {
  color: #ffe79a;
}

.campaign-status-card--warn {
  border-color: rgba(255, 193, 7, 0.55);
  background: rgba(255, 193, 7, 0.08);
}

.campaign-status-card--warn .campaign-status-card-msg {
  color: #ffd580;
}

.campaign-status-card--error {
  border-color: rgba(255, 107, 107, 0.55);
  background: rgba(255, 107, 107, 0.08);
}

.campaign-status-card--error .campaign-status-card-msg {
  color: #ffb8a8;
}

.campaign-status-card--paused {
  border-color: rgba(108, 99, 255, 0.45);
  background: rgba(108, 99, 255, 0.07);
}

.campaign-status-card--paused .campaign-status-card-msg {
  color: #cbcaff;
}
```

- [ ] **Step 2: Verificar visualmente en DevTools**

Arranca `npm run dev`. La tarjeta debe verse al inicio de Mi Campaña con el texto "¿QUÉ ESTÁ PASANDO?" en pequeño, gris, mayúsculas, y un mensaje vacío debajo (todavía no hay JS que lo llene — eso es Task 6).

Prueba cada variante en consola:
```js
> const c = document.getElementById('campaign-status-card');
> const m = document.getElementById('campaign-status-card-msg');
> c.className = 'campaign-status-card campaign-status-card--ok'; m.textContent = '🟢 Bot activo. …';
> c.className = 'campaign-status-card campaign-status-card--waiting'; m.textContent = '🟡 Esperando…';
> c.className = 'campaign-status-card campaign-status-card--error'; m.textContent = '🔴 Detenido por Facebook…';
> c.className = 'campaign-status-card campaign-status-card--paused'; m.textContent = '⏸️ Pausado…';
> c.className = 'campaign-status-card campaign-status-card--idle'; m.textContent = '';
```
Cada uno debe cambiar el fondo / borde sin saltos de layout.

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/styles.css
git commit -m "feat(ui): add color variants for campaign status card"
```

---

## Task 6: JS — Lógica de la tarjeta de estado + hook al ciclo de refresco

Estado a contemplar (en orden de prioridad — la primera condición que matchea gana):

1. `restrictionActive` → `--error` + `status_stopped_restriction` con countdown.
2. Sesión expirada (banner `#session-expired-alert` no oculto) → `--error` + `status_stopped_session_expired`.
3. `!running` y nunca arrancó (campaign.status !== 'paused') → `--idle` + `status_idle_not_started`.
4. `!running` y la última pausa fue voluntaria (campaign.status === 'paused' || === 'stopped' y antes corría) → `--paused` + `status_stopped_voluntary`.
5. `running && paused` → `--paused` + `status_paused_user`.
6. `running && !paused && fuera de horario` → `--waiting` + `status_running_waiting_hours`.
7. `running && !paused && nextRunAt && lastRoundFinished` → `--ok` + `status_running_just_posted` (con `n` de últimos 5 min y countdown).
8. `running && !paused && nextRunAt && nunca terminó ronda` → `--waiting` + `status_running_pre_first_round`.

Para detectar "publicó hace poco" usamos el historial: contamos entradas con `result === 'ok'` cuyo `at >= ahora - 10 min`. Para distinguir voluntario vs no, miramos `data.campaign?.status` que el main escribe (`'paused' / 'running' / 'stopped'`).

**Files:**
- Modify: `postrix-app/src/renderer.js` — agregar dos funciones nuevas + un hook en `refreshStats`

- [ ] **Step 1: Agregar la función `formatStatusClockHHmm`**

Localiza en `renderer.js` la función `formatNextRunMs` (línea ~1290). Inmediatamente **después** de su cierre (línea ~1299, justo después del `}`), agrega:

```js
  /** Hora local en formato HH:mm. Usa locale del idioma activo. */
  function formatStatusClockHHmm(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /** Cuenta de publicaciones OK en los últimos `ms` milisegundos del historial. */
  function countRecentOkPosts(history, ms) {
    const cutoff = Date.now() - ms;
    let n = 0;
    for (const h of history || []) {
      if (h.result !== 'ok' || !h.at) continue;
      const t = Date.parse(h.at);
      if (!Number.isNaN(t) && t >= cutoff) n += 1;
    }
    return n;
  }

  /** Está dentro del horario configurado (hourStart..hourEnd hoy)? */
  function isWithinPostingHours(data) {
    const s = data.campaign?.session || {};
    const rules = data.rules || {};
    const hourStart = s.hourStart || rules.hourStart || '09:00';
    const hourEnd = s.hourEnd || rules.hourEnd || '19:00';
    const toMin = (str) => {
      const [h, m] = String(str).split(':').map((n) => Number(n) || 0);
      return h * 60 + m;
    };
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return { inside: nowMin >= toMin(hourStart) && nowMin < toMin(hourEnd), hourStart, hourEnd };
  }
```

- [ ] **Step 2: Agregar la función `pickCampaignStatus`**

Inmediatamente después de las tres helpers del Step 1, agrega:

```js
  /**
   * Decide la variante visual y el texto de la tarjeta de estado.
   * Función pura: solo lee `botSt` y `data` (sin DOM, sin IPC).
   * Devuelve { variant, text } donde variant ∈ idle|ok|waiting|warn|error|paused.
   */
  function pickCampaignStatus(botSt, data) {
    const sessionExpired = !document
      .getElementById('session-expired-alert')
      ?.classList.contains('hidden');

    // 1. Restricción Facebook activa
    if (botSt.restrictionActive && botSt.restrictionUntil) {
      const diff = Math.max(0, Number(botSt.restrictionUntil) - Date.now());
      return {
        variant: 'error',
        text: t('status_stopped_restriction').replace('{delay}', formatDelayMs(diff)),
      };
    }

    // 2. Sesión expirada (banner azul visible)
    if (sessionExpired) {
      return { variant: 'error', text: t('status_stopped_session_expired') };
    }

    // 3. Bot detenido
    if (!botSt.running) {
      const campaignStatus = data.campaign?.status || 'stopped';
      // El usuario lo pausó/detuvo a propósito
      if (campaignStatus === 'paused' || data.campaign?.session?.userStopped) {
        return { variant: 'paused', text: t('status_stopped_voluntary') };
      }
      return { variant: 'idle', text: t('status_idle_not_started') };
    }

    // 4. Bot pausado por el usuario
    if (botSt.paused) {
      return { variant: 'paused', text: t('status_paused_user') };
    }

    // 5. Bot corriendo, fuera de horario
    const hrs = isWithinPostingHours(data);
    if (!hrs.inside) {
      return {
        variant: 'waiting',
        text: t('status_running_waiting_hours').replace('{clock}', hrs.hourStart),
      };
    }

    // 6. Bot corriendo, en horario, próxima ronda agendada
    if (botSt.nextRunAt) {
      const target = new Date(botSt.nextRunAt);
      const diff = Math.max(0, target.getTime() - Date.now());
      const recentN = countRecentOkPosts(data.history, 10 * 60 * 1000);
      // ¿Ya terminó al menos una ronda? Detectamos por entradas OK en los últimos 10 min.
      // Si recentN === 0 y no hay historial OK reciente, asumimos pre-first-round.
      if (recentN > 0) {
        const key = recentN === 0 ? 'status_running_just_posted_zero' : 'status_running_just_posted';
        return {
          variant: 'ok',
          text: t(key)
            .replace('{n}', String(recentN))
            .replace('{delay}', formatDelayMs(diff))
            .replace('{clock}', formatStatusClockHHmm(target)),
        };
      }
      return { variant: 'waiting', text: t('status_running_pre_first_round') };
    }

    // 7. Fallback: corriendo, en horario, sin próxima ronda aún
    return { variant: 'waiting', text: t('status_running_pre_first_round') };
  }

  /** Dibuja la tarjeta de estado en el DOM. */
  function renderCampaignStatusCard(botSt, data) {
    const card = document.getElementById('campaign-status-card');
    const msgEl = document.getElementById('campaign-status-card-msg');
    if (!card || !msgEl) return;
    const { variant, text } = pickCampaignStatus(botSt, data);
    const className = `campaign-status-card campaign-status-card--${variant}`;
    if (card.className !== className) card.className = className;
    if (msgEl.textContent !== text) msgEl.textContent = text;
  }
```

- [ ] **Step 3: Llamar `renderCampaignStatusCard` desde `refreshStats`**

Localiza en `renderer.js` la función `refreshStats` (línea ~1310). El bloque actual termina con:
```js
    await updateCampaignWelcomeCard();
  }
```

Reemplázalo por:
```js
    await updateCampaignWelcomeCard();
    renderCampaignStatusCard(st, data);
  }
```

(es decir, agrega `renderCampaignStatusCard(st, data);` como última línea dentro del cuerpo de `refreshStats`, antes del `}`).

- [ ] **Step 4: Localizar el label de la tarjeta para que se traduzca**

La tarjeta tiene `<p class="campaign-status-card-label" data-i18n="status_card_title">…</p>`. `applyI18n` ya la traduce automáticamente en cambio de idioma.

- [ ] **Step 5: Verificación manual — escenarios**

`npm run dev`. Estados a probar:

**5.1 Bot detenido sin haber arrancado (estado inicial):**
```js
> await window.postrix.botStop();
> (await window.postrix.settingsGet()).campaign?.status
// 'stopped'
```
La tarjeta debe decir: `⚪ Bot detenido. Configura tu campaña y presiona INICIAR` con fondo gris.

**5.2 Bot pausado por el usuario:**
- Inicia el bot (`▶ INICIAR`). Cuando esté corriendo, presiona `⏸ PAUSAR`.
- La tarjeta debe decir: `⏸️ Bot pausado. Dale a REANUDAR cuando quieras continuar` con fondo morado.

**5.3 Bot corriendo, fuera de horario:**
- Cambia `cq-hour-end` a una hora ya pasada (ej. si son las 15:00, ponlo en 10:00).
- Reinicia el bot.
- La tarjeta debe decir: `🟡 Bot esperando. Empezará a las {hora}` con fondo amarillo.

**5.4 Bot corriendo, primera ronda en breve:**
- Restaura horario válido. Inicia el bot. Antes de que termine la primera ronda:
- La tarjeta debe decir: `🟡 Bot activo. La primera ronda iniciará en breve` con fondo amarillo.

**5.5 Bot corriendo, ya publicó:**
- Después de que termine al menos una ronda con publicaciones OK:
- La tarjeta debe decir: `🟢 Bot activo. Publicó en X grupos en la última ronda. Próxima ronda en HhMmin (a las HH:mm)` con fondo verde.

**5.6 Restricción Facebook:**
```js
> // Simular restricción 24h (no realmente activarla, solo testing UI)
> const s = await window.postrix.settingsGet();
> // Si no hay manera de inyectar restrictionUntil sin tocar main, esta prueba se hace
> // visualmente con DevTools cambiando className y texto:
> document.getElementById('campaign-status-card').className = 'campaign-status-card campaign-status-card--error';
> document.getElementById('campaign-status-card-msg').textContent = '🔴 Bot detenido por Facebook. Reanudará en 23h 45min';
```
La tarjeta debe verse roja.

**5.7 Sesión expirada:**
- En DevTools: `document.getElementById('session-expired-alert').classList.remove('hidden')`.
- Espera al siguiente tick (1 s). La tarjeta debe decir: `🔴 Bot detenido: tu sesión de Facebook expiró. Reconéctala en Configuración`.

- [ ] **Step 6: Verificación de actualización en tiempo real**

La tarjeta se re-renderiza cada segundo (`setInterval(refreshStats, 1000)` ya existe). Cuando el bot está corriendo con `nextRunAt` futuro, el countdown `Próxima ronda en H:MM:SS (a las HH:mm)` debe descender cada segundo sin parpadeo. Si parpadea, revisa que el `if (msgEl.textContent !== text) msgEl.textContent = text;` no esté reasignando innecesariamente — pero si parpadea con `clock` fija (no cambia HH:mm), está bien: solo cambia el `delay` cada segundo.

- [ ] **Step 7: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "feat(onboarding): render permanent 'what is happening?' status card"
```

---

## Task 7: HTML — Botón flotante `?` + esqueleto del modal de ayuda (PART 6)

El botón vive como hijo directo de `<body>` (fuera del `.layout`) para que se mantenga fijo en pantalla independiente del scroll del panel. El modal usa el mismo patrón que `#modal-search`.

**Files:**
- Modify: `postrix-app/src/index.html` — antes del `<div id="toast-stack" …>` (línea ~407) y al cierre de `<body>` (línea ~411)

- [ ] **Step 1: Insertar botón flotante**

Localiza:
```html
  <!-- Toasts de publicación exitosa (apilados) -->
  <div id="toast-stack" class="toast-stack" aria-live="polite"></div>

  <script src="renderer.js"></script>
</body>
```

Sustituye por:
```html
  <!-- Toasts de publicación exitosa (apilados) -->
  <div id="toast-stack" class="toast-stack" aria-live="polite"></div>

  <!-- Botón flotante de ayuda (PART 6) — visible siempre dentro del dashboard -->
  <button id="btn-help-float" class="help-fab hidden" type="button" data-i18n-aria-label="help_fab_aria" aria-label="Abrir centro de ayuda" title="Ayuda">
    <span class="help-fab-glyph" aria-hidden="true">?</span>
    <span class="help-fab-label" data-i18n="help_fab_label">Ayuda</span>
  </button>

  <!-- Modal de ayuda (PART 6) -->
  <div id="modal-help" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-help-title">
    <div class="modal-backdrop" data-help-close="1"></div>
    <div class="modal-card card-elevated modal-help-card">
      <button id="modal-help-close" class="modal-help-close" type="button" aria-label="Cerrar">×</button>
      <h3 id="modal-help-title" data-i18n="help_modal_title">Centro de ayuda</h3>
      <p class="muted modal-help-intro" data-i18n="help_modal_intro"></p>

      <section class="modal-help-section">
        <h4 class="modal-help-section-title" data-i18n="faq_section_title">Preguntas frecuentes</h4>
        <div id="modal-help-faq" class="faq-list">
          <details class="faq-item">
            <summary data-i18n="faq_q1">¿Por qué el bot no publica?</summary>
            <p data-i18n="faq_a1"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q2">¿Por qué algunos grupos aparecen en rojo o naranja?</summary>
            <p data-i18n="faq_a2"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q3">¿Cómo cambio el horario de publicación?</summary>
            <p data-i18n="faq_a3"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q4">¿Qué hago si Facebook me marca restricción?</summary>
            <p data-i18n="faq_a4"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q5">¿Qué significa "Solicitud pendiente" en un grupo?</summary>
            <p data-i18n="faq_a5"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q6">¿Cómo agrego más grupos?</summary>
            <p data-i18n="faq_a6"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q7">¿Puedo cambiar el mensaje mientras el bot está corriendo?</summary>
            <p data-i18n="faq_a7"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q8">¿Qué hago si la app se cierra sola?</summary>
            <p data-i18n="faq_a8"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q9">¿Cuántas publicaciones hace al día?</summary>
            <p data-i18n="faq_a9"></p>
          </details>
          <details class="faq-item">
            <summary data-i18n="faq_q10">¿Qué hago si nada funciona?</summary>
            <p data-i18n="faq_a10"></p>
          </details>
        </div>
      </section>

      <section class="modal-help-section modal-help-diag">
        <p class="muted modal-help-diag-hint" data-i18n="help_copy_diagnostics_hint"></p>
        <button id="btn-copy-diagnostics-modal" class="btn btn-secondary" type="button" data-i18n="btn_copy_diagnostics">📋 Copiar diagnóstico</button>
      </section>
    </div>
  </div>

  <script src="renderer.js"></script>
</body>
```

- [ ] **Step 2: Verificar la sintaxis HTML**

Arranca `npm run dev`. La app debe cargar sin errores. El botón `?` no se verá aún (está oculto por la clase `hidden`); Task 8 le da estilo y Task 9 lo activa al entrar al dashboard.

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/index.html
git commit -m "feat(ui): add floating help button + help modal with FAQ skeleton"
```

---

## Task 8: CSS — Estilos del botón flotante y modal de ayuda

**Files:**
- Modify: `postrix-app/src/styles.css` — al final del archivo, después de los estilos de status-card de Task 5

- [ ] **Step 1: Insertar los estilos**

```css
/* —— Botón flotante de ayuda (PART 6) —— */
.help-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 95;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px 0 14px;
  border: 1px solid rgba(0, 212, 255, 0.5);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.18), rgba(108, 99, 255, 0.18));
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.help-fab:hover {
  transform: translateY(-2px);
  border-color: var(--accent2);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
}

.help-fab:active {
  transform: translateY(0);
}

.help-fab-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--accent2);
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.6);
  border-radius: 50%;
}

.help-fab-label {
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* —— Modal de ayuda (PART 6) —— */
.modal-help-card {
  width: min(620px, 100%);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  padding: 24px 26px 22px;
}

.modal-help-card h3 {
  margin: 0 0 6px;
  padding-right: 32px;
  font-size: 1.2rem;
}

.modal-help-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
}

.modal-help-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.modal-help-intro {
  margin: 0 0 18px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-help-section {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-help-section-title {
  margin: 0 0 12px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.faq-list {
  overflow-y: auto;
  max-height: 50vh;
  padding-right: 4px;
}

.faq-item {
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.faq-item[open] {
  border-color: rgba(0, 212, 255, 0.35);
  background: rgba(0, 212, 255, 0.04);
}

.faq-item > summary {
  list-style: none;
  cursor: pointer;
  padding: 10px 14px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
  position: relative;
  padding-right: 36px;
}

.faq-item > summary::-webkit-details-marker {
  display: none;
}

.faq-item > summary::after {
  content: '+';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  color: var(--accent2);
  transition: transform 0.15s ease;
}

.faq-item[open] > summary::after {
  content: '−';
}

.faq-item > p {
  margin: 0;
  padding: 0 14px 12px;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.modal-help-diag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.modal-help-diag-hint {
  margin: 0;
  flex: 1 1 200px;
  font-size: 0.85rem;
  line-height: 1.4;
}
```

- [ ] **Step 2: Verificar visualmente**

Arranca `npm run dev`. En la consola:
```js
> document.getElementById('btn-help-float').classList.remove('hidden');
> document.getElementById('modal-help').classList.remove('hidden');
```
Debes ver:
- Un botón redondeado abajo-derecha con un círculo cyan con `?` y la palabra "Ayuda".
- El modal centrado con el título "Centro de ayuda", la intro, la sección "PREGUNTAS FRECUENTES" con 10 acordeones cerrados (cada uno con un `+` cyan a la derecha), y abajo la sección con "Copiar diagnóstico" + el hint.
- Click en cualquier `<summary>` debe expandir/colapsar el acordeón (es nativo de `<details>`).

Cierra con:
```js
> document.getElementById('modal-help').classList.add('hidden');
> document.getElementById('btn-help-float').classList.add('hidden');
```

- [ ] **Step 3: Commit**

```bash
git add postrix-app/src/styles.css
git commit -m "feat(ui): style floating help button, modal and FAQ accordions"
```

---

## Task 9: JS — Mostrar el botón flotante en dashboard + open/close del modal

**Files:**
- Modify: `postrix-app/src/renderer.js` — dos cambios

- [ ] **Step 1: Mostrar el botón al entrar al dashboard**

Localiza la función `setView` (línea ~610):
```js
  function setView(name) {
    const act = document.getElementById('view-activation');
    const dash = document.getElementById('view-dashboard');
    if (name === 'dashboard') {
      act.classList.add('hidden');
      act.classList.remove('fade-in');
      dash.classList.remove('hidden');
      void dash.offsetWidth;
      dash.classList.add('fade-in');
    } else {
      dash.classList.add('hidden');
      dash.classList.remove('fade-in');
      act.classList.remove('hidden');
      void act.offsetWidth;
      act.classList.add('fade-in');
    }
  }
```

Reemplázalo por:
```js
  function setView(name) {
    const act = document.getElementById('view-activation');
    const dash = document.getElementById('view-dashboard');
    const helpFab = document.getElementById('btn-help-float');
    if (name === 'dashboard') {
      act.classList.add('hidden');
      act.classList.remove('fade-in');
      dash.classList.remove('hidden');
      void dash.offsetWidth;
      dash.classList.add('fade-in');
      if (helpFab) helpFab.classList.remove('hidden');
    } else {
      dash.classList.add('hidden');
      dash.classList.remove('fade-in');
      act.classList.remove('hidden');
      void act.offsetWidth;
      act.classList.add('fade-in');
      if (helpFab) helpFab.classList.add('hidden');
    }
  }
```

- [ ] **Step 2: Agregar handlers para abrir/cerrar el modal**

Localiza el bloque del `// Tabs` (línea ~1844). Inmediatamente **antes** de `// Tabs`, agrega:

```js
  // —— Modal de ayuda (PART 6) ——
  (function initHelpModal() {
    const fab = document.getElementById('btn-help-float');
    const modal = document.getElementById('modal-help');
    const closeBtn = document.getElementById('modal-help-close');
    const backdrop = modal?.querySelector('.modal-backdrop');
    if (!fab || !modal) return;

    const openModal = () => {
      modal.classList.remove('hidden');
      // Mover foco al título para accesibilidad
      const title = document.getElementById('modal-help-title');
      if (title) {
        title.setAttribute('tabindex', '-1');
        title.focus();
      }
    };
    const closeModal = () => {
      modal.classList.add('hidden');
      // Devolver foco al botón flotante
      fab.focus();
    };

    fab.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
  })();
```

- [ ] **Step 3: Verificación manual**

`npm run dev`. Después de activar licencia / entrar al dashboard:

1. El botón `?` Ayuda aparece abajo-derecha.
2. Click → se abre el modal de ayuda con la FAQ.
3. Click en `×` o en el backdrop oscuro → se cierra.
4. Tecla `Esc` → se cierra.
5. En el modal, hacer click en cualquier pregunta expande la respuesta (nativo `<details>`).
6. Múltiples acordeones pueden estar abiertos a la vez (también nativo de `<details>`).
7. Cambiar idioma con "ES / EN" — toda la FAQ cambia al idioma activo (porque `applyI18n` re-aplica `data-i18n`).

- [ ] **Step 4: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "feat(onboarding): show floating help button + open/close help modal"
```

---

## Task 10: JS — Extraer `runCopyDiagnostics` + wirear botón del modal

El botón "Copiar diagnóstico" ya existe en Ajustes (`#btn-copy-diagnostics`). El modal de ayuda tiene su propia copia (`#btn-copy-diagnostics-modal`). Extraemos la lógica a una función para evitar duplicar (DRY).

**Files:**
- Modify: `postrix-app/src/renderer.js` — refactor del handler existente

- [ ] **Step 1: Localizar el handler actual**

Está en la línea ~2325. El bloque es:
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

- [ ] **Step 2: Reemplazar por la función extraída + ambos handlers**

Sustituye el bloque anterior por:
```js
  /** Recopila y copia el diagnóstico al portapapeles. Acepta el botón que disparó la acción
   * para deshabilitarlo y restaurar su texto al terminar. Usado por Ajustes y modal de ayuda. */
  async function runCopyDiagnostics(btn) {
    if (btn) {
      btn.disabled = true;
      btn.dataset.prevLabel = btn.textContent;
      btn.textContent = lang === 'es' ? '⏳ Recopilando...' : '⏳ Collecting...';
    }
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
        btn.textContent = btn.dataset.prevLabel || t('btn_copy_diagnostics');
        delete btn.dataset.prevLabel;
      }
    }
  }

  document.getElementById('btn-copy-diagnostics')?.addEventListener('click', (e) => {
    void runCopyDiagnostics(e.currentTarget);
  });
  document.getElementById('btn-copy-diagnostics-modal')?.addEventListener('click', (e) => {
    void runCopyDiagnostics(e.currentTarget);
  });
```

- [ ] **Step 3: Verificación manual**

`npm run dev`. Después de entrar al dashboard:

1. **Desde Ajustes**: ve a la pestaña "Configuración" → click en `📋 Copiar diagnóstico`. El botón muestra `⏳ Recopilando...`, luego vuelve a su texto original. Aparece un toast verde "Diagnóstico copiado…". Pega en cualquier editor: el texto del diagnóstico está completo.

2. **Desde modal de ayuda**: abre el modal con el botón flotante `?`. Click en `📋 Copiar diagnóstico` al final del modal. Mismo comportamiento que en Ajustes (botón temporal `⏳`, toast).

3. Cambia idioma a inglés y repite 1 y 2. El texto temporal `⏳ Collecting...` (no `Recopilando...`) aparece, y el botón vuelve a `📋 Copy diagnostics`.

- [ ] **Step 4: Commit**

```bash
git add postrix-app/src/renderer.js
git commit -m "refactor(diagnostics): extract runCopyDiagnostics; wire help modal button"
```

---

## Task 11: Verificación end-to-end + commit final del feature

Después de las tasks 1-10, todas las partes 4, 5 y 6 están integradas. Esta task es un repaso completo, no introduce código nuevo.

**Files:** ninguno modificado.

- [ ] **Step 1: Verificación completa PART 4 — tooltips**

Arranca `npm run dev`. En el dashboard, comprueba que aparecen exactamente seis íconos `?` cyan en:
1. Label "¿Cada cuánto publicar?" → "Tiempo entre rondas. Recomendado: 2-3 horas."
2. Label "¿Hasta qué hora publicar hoy?" → "Hora a la que el bot deja de publicar."
3. Label "¿En cuántos grupos por ronda?" → "Grupos por vuelta. Empieza con 20."
4. Botón "Conectar mi cuenta de Facebook" → "Necesario para que el bot pueda publicar."
5. Botón "Buscar grupos por tema" → "Encuentra grupos por palabras clave."
6. Botón "Agregar grupo por link" → "Pega la URL directa de un grupo."

Cambia a inglés y comprueba que los seis se traducen.

- [ ] **Step 2: Verificación completa PART 5 — status card**

Reproduce los 7 escenarios listados en Task 6 Step 5. Cada uno debe mostrar el texto y color correcto.

- [ ] **Step 3: Verificación completa PART 6 — modal de ayuda y FAQ**

Reproduce los 7 puntos listados en Task 9 Step 3 y los 3 puntos listados en Task 10 Step 3.

- [ ] **Step 4: Lectura cruzada de strings (no debe haber teclas i18n faltantes)**

```bash
grep -oE "data-i18n=\"[a-z_]+\"" postrix-app/src/index.html | sort -u | sed 's/data-i18n="//;s/"$//' > /tmp/used_keys.txt
grep -oE "^\s+[a-z_]+:" postrix-app/src/renderer.js | sed -E 's/^\s+//;s/:$//' | sort -u > /tmp/defined_keys.txt
comm -23 /tmp/used_keys.txt /tmp/defined_keys.txt
```

La diferencia debe estar vacía: toda clave `data-i18n` usada en HTML existe en `STR`. Si aparece alguna, agrégala en ambos idiomas.

- [ ] **Step 5: Smoke test del bot real**

Con licencia activa y cuenta Facebook conectada, inicia el bot 5 minutos en un entorno seguro (1 grupo de pruebas). Mientras corre, comprueba que la status card evoluciona correctamente: `🟡 primera ronda en breve` → `🟢 publicó en N grupos`. Detén el bot. La card debe pasar a `⏸️ Bot pausado…` o `⚪ Bot detenido…`.

- [ ] **Step 6: Build de producción (smoke)**

```bash
npm run build:dir
```
El build debe completar sin errores. Abre `dist/win-unpacked/Postrix by Solvix.exe` y comprueba que la app arranca y muestra el botón flotante `?` y los tooltips.

- [ ] **Step 7: Tag de release-candidate (opcional, si el usuario lo pide)**

```bash
git tag -a v1.0.8-rc1 -m "rc: onboarding tooltips, status card, FAQ help modal"
```

---

## Notas de mantenimiento

- **Si el usuario decide que la status card no debe verse cuando el bot está detenido sin haber arrancado nunca**: cambia la variante `'idle'` en `pickCampaignStatus` para devolver `{ variant: 'idle', text: '' }` y agrega CSS `.campaign-status-card-msg:empty + … { display:none; }` (o más simple: ocultar la card cuando `text === ''`).
- **Si añaden más preguntas al FAQ**: la lista en `index.html` se extiende con más `<details class="faq-item">` y las claves `faq_qN` / `faq_aN` se agregan en `STR.es` y `STR.en`. No hay tope, pero más de 15 hace el modal pesado — preferir agruparlas en sub-acordeones.
- **Si añaden más campos con tooltip**: reutiliza el pattern `<span class="help-tooltip" tabindex="0" role="button">?<span class="help-tooltip-bubble" data-i18n="tip_xxx">…</span></span>` y agrega la clave `tip_xxx` a `STR`.

---

## Self-review (al cierre del plan)

- **Cobertura del spec:**
  - PART 4 (6 tooltips): Tasks 1-3 ✓ (string keys `tip_*`, CSS `.help-tooltip`, HTML en los 6 sitios)
  - PART 5 (tarjeta de estado con 6 reglas): Tasks 4-6 ✓ (HTML estable, CSS variantes, JS `pickCampaignStatus` cubre los 6 estados + idle)
  - PART 6 (modal FAQ con 10 acordeones + atajo a diagnóstico): Tasks 7-10 ✓ (botón flotante, modal, 10 `<details>`, hint final y botón "Copiar diagnóstico" que reutiliza la lógica existente)

- **Placeholder scan:** Ningún paso usa "TBD/TODO/implement later". Cada step tiene código exacto y rutas exactas.

- **Type consistency:** `pickCampaignStatus(botSt, data)` → `{ variant, text }`. `renderCampaignStatusCard` consume `{ variant, text }`. `runCopyDiagnostics(btn)` consistente con los dos callers. Strings `faq_q1..faq_q10` y `faq_a1..faq_a10` referenciados en HTML y definidos en STR.

- **Líneas de archivo referenciadas:** las he derivado del estado actual del repo a 2026-05-16. Si un task posterior moviera líneas, el ejecutor debe re-localizar la sección por nombre/comentario en vez de número exacto.
