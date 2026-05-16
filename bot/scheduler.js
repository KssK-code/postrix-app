/**
 * Programador de publicaciones: ventana horaria, warm-up, intervalo mínimo por grupo, límite diario global.
 */
import cron from 'node-cron';
import { getStore } from '../config/settings.js';
import { writeLog } from '../utils/logger.js';
import { publishToGroup, randomDelay, checkFacebookSession } from './facebook.js';

/** Callback opcional: progreso por grupo / espera (IPC al renderer). */
let onProgressReport = null;

/**
 * Reglas efectivas: globales (rules) + ajustes rápidos de sesión (campaign.session).
 */
export function getEffectiveRules(store) {
  const base = { ...(store.get('rules') || {}) };
  const session = store.get('campaign')?.session;
  if (!session || typeof session !== 'object') {
    if (!base.hourStart || String(base.hourStart).length < 4) base.hourStart = '09:00';
    if (!base.hourEnd || String(base.hourEnd).length < 4) base.hourEnd = '19:00';
    return base;
  }
  if (session.intervalHours != null) {
    const h = Number(session.intervalHours);
    if (!Number.isNaN(h) && h > 0) base.intervalBaseMinutes = h * 60;
  }
  if (typeof session.hourStart === 'string' && session.hourStart.length >= 4) {
    base.hourStart = session.hourStart;
  }
  if (typeof session.hourEnd === 'string' && session.hourEnd.length >= 4) {
    base.hourEnd = session.hourEnd;
  }
  if (session.maxGroupsPerRound != null) {
    const n = Math.min(80, Math.max(1, Number(session.maxGroupsPerRound)));
    if (!Number.isNaN(n)) base.maxGroupsPerRound = n;
  }
  // Valores por defecto del día si faltan (evita store viejo con horas vacías o invertidas solo en parte)
  if (!base.hourStart || String(base.hourStart).length < 4) base.hourStart = '09:00';
  if (!base.hourEnd || String(base.hourEnd).length < 4) base.hourEnd = '19:00';
  return base;
}

let cronJob = null;
/** Cuenta activa para runRound dentro del cron (tras startScheduler). */
let currentAccountId = 'default';
/** Marca de tiempo (ms) a partir de la cual el cron puede lanzar otra ronda. */
let nextRunTimestamp = 0;
/** Evita dos rondas solapadas (nunca Promise.all en grupos; tampoco dos runRound a la vez). */
let runRoundInProgress = false;

/** Saltar sin pausa 15–30 s y sin contar como error de publicación */
const SKIP_ROUND_REASONS = new Set([
  'marketplace_only_group',
  'buy_sell_group_no_text_post',
  'pending_approval',
  'questions_required',
  'not_member',
]);

/** Solo estos motivos marcan el grupo en store como compraventa (no reintentar feed) */
const SKIP_MARKETPLACE_STORE_REASONS = new Set(['marketplace_only_group', 'buy_sell_group_no_text_post']);

/** Motivos que marcan al grupo como solicitud pendiente (incluye muro de preguntas) */
const SKIP_PENDING_STORE_REASONS = new Set(['pending_approval', 'questions_required']);

/**
 * Marca el grupo en el store para no volver a intentar publicación tipo feed.
 */
function markGroupMembershipMarketplace(store, groupId) {
  const groups = store.get('groups') || [];
  const id = String(groupId);
  const next = groups.map((g) =>
    String(g.id) === id ? { ...g, membership: 'marketplace' } : g
  );
  store.set('groups', next);
}

function markGroupNotMember(store, groupId) {
  const groups = store.get('groups') || [];
  const id = String(groupId);
  const next = groups.map((g) =>
    String(g.id) === id ? { ...g, membership: 'not_member' } : g
  );
  store.set('groups', next);
}

function markGroupPending(store, groupId) {
  const groups = store.get('groups') || [];
  const id = String(groupId);
  const next = groups.map((g) =>
    String(g.id) === id ? { ...g, membership: 'pending' } : g
  );
  store.set('groups', next);
}

/**
 * Limpia stats de rotación diaria y entradas antiguas de publicación por grupo.
 */
function pruneSchedulerDayStats(store) {
  const today = new Date().toISOString().split('T')[0];
  const stats = { ...(store.get('stats') || {}) };
  const oldRound = stats.roundIndexByDay && typeof stats.roundIndexByDay === 'object' ? stats.roundIndexByDay : {};
  const oldPosts = stats.groupPostsByDay && typeof stats.groupPostsByDay === 'object' ? stats.groupPostsByDay : {};
  const nextRound = Object.prototype.hasOwnProperty.call(oldRound, today)
    ? { [today]: oldRound[today] }
    : {};
  const nextPosts =
    oldPosts[today] && typeof oldPosts[today] === 'object'
      ? { [today]: { ...oldPosts[today] } }
      : {};
  stats.roundIndexByDay = nextRound;
  stats.groupPostsByDay = nextPosts;

  // Quitar marcas de última publicación más viejas de 7 días (evita crecer el objeto sin límite)
  const groupLastPostRaw =
    stats.groupLastPost && typeof stats.groupLastPost === 'object' ? stats.groupLastPost : {};
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600000;
  const cleanedLastPost = {};
  for (const [id, time] of Object.entries(groupLastPostRaw)) {
    const t = Number(time) || 0;
    if (t > sevenDaysAgo) cleanedLastPost[id] = t;
  }
  stats.groupLastPost = cleanedLastPost;

  store.set('stats', stats);
}

/** Tras publicación OK: guarda timestamp para respetar el intervalo mínimo en el mismo grupo. */
function markGroupLastPost(store, groupId) {
  const stats = { ...(store.get('stats') || {}) };
  const gl = {
    ...(stats.groupLastPost && typeof stats.groupLastPost === 'object' ? stats.groupLastPost : {}),
  };
  gl[String(groupId)] = Date.now();
  stats.groupLastPost = gl;
  store.set('stats', stats);
}

/** Duración de pausa automática tras detectar restricción anti-spam de Facebook */
const FACEBOOK_RESTRICTION_MS = 24 * 60 * 60 * 1000;

let state = {
  running: false,
  paused: false,
  nextRunAt: null,
  lastTick: null,
  /** ms entre rondas (calculado al terminar cada ronda) */
  currentRoundIntervalMs: 0,
  /** true si la última pausa larga fue por mensaje de restricción de Facebook */
  restrictionDetected: false,
  /** Timestamp ms hasta el cual aplica la pausa (null si no hay) */
  restrictionUntil: null,
};

/**
 * Si hay pausa por restricción de Facebook vigente, devuelve blocked y horas restantes.
 * Limpia el store si la fecha ya pasó.
 */
export function getFacebookRestrictionBlockInfo(store) {
  const s = store || getStore();
  let until = Number(s.get('bot.restrictionUntil')) || 0;
  if (until > 0 && Date.now() >= until) {
    s.set('bot.restrictionUntil', 0);
    until = 0;
  }
  if (until > 0 && Date.now() < until) {
    const hoursLeft = Math.max(1, Math.ceil((until - Date.now()) / 3600000));
    return { blocked: true, until, hoursLeft };
  }
  return { blocked: false, until: 0, hoursLeft: 0 };
}

/** Igual que computeNextDelayMs; nombre alineado con el flujo de arranque. */
function calculateNextDelay(rules) {
  return computeNextDelayMs(rules);
}

/**
 * ¿La hora actual está dentro de [hourStart, hourEnd] el mismo día?
 * Si inicio >= fin (dato corrupto o invertido), no se aplica restricción (deja publicar).
 */
function nowInWindow(rules) {
  const hourStart = rules.hourStart || '09:00';
  const hourEnd = rules.hourEnd || '19:00';
  const [startH, startM] = String(hourStart).split(':').map((x) => parseInt(x, 10) || 0);
  const [endH, endM] = String(hourEnd).split(':').map((x) => parseInt(x, 10) || 0);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes >= endMinutes) {
    // Horario inválido en store (ej. fin antes que inicio): no bloquear
    return true;
  }

  if (nowMinutes < startMinutes || nowMinutes > endMinutes) {
    return false;
  }
  return true;
}

/**
 * Días desde primera ejecución guardada (para warm-up 7 días).
 */
function getWarmUpDayIndex() {
  const store = getStore();
  const start = store.get('warmUpStartDate');
  if (!start) return 0;
  const a = new Date(start);
  const b = new Date();
  const diff = Math.floor((b - a) / (86400 * 1000));
  return Math.min(7, Math.max(0, diff + 1));
}

function warmUpFactor(dayIndex) {
  const pct = [0.25, 0.35, 0.45, 0.5, 0.55, 0.6, 0.7];
  return pct[Math.min(dayIndex, 6)] ?? 0.7;
}

/**
 * Calcula cuántos grupos usar esta ronda según warm-up y máximo configurado.
 */
export function computeGroupsForRound(groups, rules) {
  const max = Math.min(80, rules.maxGroupsPerRound || 60);
  const activeCount = groups.filter((g) => g.status === 'active').length;
  let n = activeCount;
  if (rules.warmUpEnabled) {
    const day = getWarmUpDayIndex();
    const factor = warmUpFactor(day);
    n = Math.ceil(n * factor);
  }
  return Math.min(max, n);
}

/**
 * Intervalo hasta la próxima ejecución (ms) con variación aleatoria.
 */
export function computeNextDelayMs(rules) {
  const base = (rules.intervalBaseMinutes || 180) * 60 * 1000;
  const varMin = (rules.randomVariationMinutes || 20) * 60 * 1000;
  const delta = Math.floor(Math.random() * (2 * varMin + 1)) - varMin;
  return Math.max(60_000, base + delta);
}

/**
 * Devuelve fecha/hora estimada de próxima publicación.
 */
export function getNextRunEstimate(rules) {
  const delay = computeNextDelayMs(rules);
  return new Date(Date.now() + delay);
}

/**
 * Verifica límites diarios de publicaciones.
 */
export function canPostToday(rules) {
  const store = getStore();
  const stats = store.get('stats') || {};
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastPostDate !== today) {
    return true;
  }
  const posts = stats.postsToday || 0;
  return posts < (rules.maxPostsPerDay || 120);
}

function bumpPostCount() {
  const store = getStore();
  const today = new Date().toISOString().slice(0, 10);
  const stats = store.get('stats') || {};
  if (stats.lastPostDate !== today) {
    stats.postsToday = 1;
    stats.lastPostDate = today;
  } else {
    stats.postsToday = (stats.postsToday || 0) + 1;
  }
  store.set('stats', stats);
}

/**
 * Ejecuta una ronda de publicaciones (varios grupos según warm-up / máximo).
 */
function progressPayload(partial) {
  if (typeof onProgressReport === 'function') {
    try {
      onProgressReport(partial);
    } catch {
      /* no romper el scheduler */
    }
  }
}

async function runRound(accountId) {
  if (runRoundInProgress) {
    console.log('[Round] ⏭️ Ronda ya en ejecución — se ignora esta llamada (sin paralelismo)');
    progressPayload({ status: 'round_in_progress' });
    return;
  }
  runRoundInProgress = true;
  try {
    await runRoundBody(accountId);
  } finally {
    runRoundInProgress = false;
  }
}

async function runRoundBody(accountId) {
  console.log('[Round] =============================');
  console.log('[Round] Iniciando ronda...');
  console.log('[Round] accountId:', accountId);

  const store = getStore();
  const groupsAll = store.get('groups') || [];
  console.log('[Round] Grupos en store (total):', groupsAll.length);

  const rules = getEffectiveRules(store);
  console.log('[Round] Reglas efectivas:', JSON.stringify(rules));

  const now = new Date();
  console.log(
    '[Round] Hora actual (local):',
    now.getHours(),
    'h',
    now.getMinutes(),
    'm'
  );
  console.log('[Round] Ventana horaria rules:', rules.hourStart, '→', rules.hourEnd);

  if (groupsAll.length === 0) {
    console.log('[Round] ❌ Sin grupos en store — abortando ronda');
    progressPayload({ status: 'no_groups' });
    return;
  }

  console.log('[Round] ✅ Hay grupos en store; filtrando activos y comprobando contenido...');

  // Solo grupos donde el usuario ya es miembro confirmado y cuya verificación fue OK
  const eligibleByMembership = groupsAll.filter(
    (g) => g.status === 'active' && g.membership === 'member'
  );
  const groups = eligibleByMembership.filter((g) => g.verifyStatus !== 'unknown');
  const skippedUnknownCount = eligibleByMembership.length - groups.length;
  if (skippedUnknownCount > 0) {
    const sampleIds = eligibleByMembership
      .filter((g) => g.verifyStatus === 'unknown')
      .slice(0, 5)
      .map((g) => g.id);
    writeLog('WARN', 'Scheduler: grupos saltados por verificación desconocida', {
      count: skippedUnknownCount,
      sampleGroupIds: sampleIds,
    });
    console.log(`[Round] ⏭ ${skippedUnknownCount} grupo(s) saltados — verifyStatus=unknown`);
  }
  const contentSlots = store.get('contentSlots') || [];
  const activeSlots = contentSlots.filter((s) => s.active && (s.text || s.imagePath));

  console.log('[Round] Grupos activos (status=active):', groups.length);
  console.log('[Round] Slots con contenido activo:', activeSlots.length);

  if (!activeSlots.length || !groups.length) {
    console.log('[Round] ❌ Sin slots activos con texto/imagen o sin grupos activos — abortando');
    writeLog('WARN', 'Scheduler: sin contenido o grupos activos');
    progressPayload({
      status: activeSlots.length === 0 ? 'no_active_content' : 'no_active_groups',
    });
    return;
  }

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
  // Sin días de descanso: publica cualquier día si está en la ventana horaria
  if (!canPostToday(rules)) {
    console.log('[Round] ❌ Límite diario de publicaciones — pausando');
    writeLog('INFO', 'Scheduler: límite diario alcanzado');
    state.paused = true;
    progressPayload({ status: 'daily_limit_reached' });
    return;
  }

  // Verificar sesión de Facebook antes de abrir ningún Chromium de publicación
  console.log('[Round] Verificando sesión de Facebook...');
  const sessionCheck = await checkFacebookSession(accountId);
  if (!sessionCheck.ok && sessionCheck.reason === 'session_expired') {
    console.log('[Round] 🔒 Sesión de Facebook expirada — bot detenido');
    writeLog('ERROR', 'Scheduler: sesión de Facebook expirada — bot detenido');
    state.running = false;
    state.paused = false;
    store.set('campaign', { ...(store.get('campaign') || {}), status: 'stopped' });
    progressPayload({ status: 'session_expired' });
    return;
  }
  if (!sessionCheck.ok && sessionCheck.reason === 'no_cookies') {
    console.log('[Round] 🔒 Sin cookies de Facebook — bot detenido');
    writeLog('ERROR', 'Scheduler: sin cookies de Facebook — bot detenido');
    state.running = false;
    state.paused = false;
    store.set('campaign', { ...(store.get('campaign') || {}), status: 'stopped' });
    progressPayload({ status: 'session_expired' });
    return;
  }
  console.log('[Round] ✅ Sesión de Facebook activa');

  console.log('[Round] ✅ Continuando con la ronda (publicaciones)...');

  // Mantener en store solo stats del día actual (rotación + publicaciones por grupo)
  pruneSchedulerDayStats(store);

  const todayKey = new Date().toISOString().split('T')[0];
  const statsSnap = store.get('stats') || {};
  const roundIdxMap =
    statsSnap.roundIndexByDay && typeof statsSnap.roundIndexByDay === 'object'
      ? statsSnap.roundIndexByDay
      : {};
  const roundIndex = roundIdxMap[todayKey] ?? 0;

  const activeGroups = groups;
  const maxBatch = Math.min(80, Math.max(1, rules.maxGroupsPerRound || 60));
  const n = computeGroupsForRound(activeGroups, rules);
  const startIndex =
    activeGroups.length > 0 ? (roundIndex * maxBatch) % activeGroups.length : 0;
  const rotatedGroups = [
    ...activeGroups.slice(startIndex),
    ...activeGroups.slice(0, startIndex),
  ];
  // Corte de la rotación + shuffle Fisher-Yates para orden diferente en cada ronda
  const groupsThisRound = rotatedGroups.slice(0, Math.min(n, rotatedGroups.length));
  for (let i = groupsThisRound.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groupsThisRound[i], groupsThisRound[j]] = [groupsThisRound[j], groupsThisRound[i]];
  }

  const statsAfterRot = { ...(store.get('stats') || {}) };
  const nextRoundIdx = { ...(statsAfterRot.roundIndexByDay || {}) };
  nextRoundIdx[todayKey] = roundIndex + 1;
  statsAfterRot.roundIndexByDay = nextRoundIdx;
  store.set('stats', statsAfterRot);

  console.log(
    `[Round] Rotación: índice de ronda del día ${roundIndex}, empieza en posición ${startIndex + 1}/${activeGroups.length} (lote ${maxBatch})`
  );

  console.log('[Round] Total grupos activos:', activeGroups.length);
  console.log('[Round] maxGroupsPerRound:', rules.maxGroupsPerRound);
  const warmDay = getWarmUpDayIndex();
  console.log(
    '[Round] warmUpEnabled:',
    !!rules.warmUpEnabled,
    'día',
    warmDay,
    'factor',
    rules.warmUpEnabled ? warmUpFactor(warmDay) : 1
  );
  console.log('[Round] n tras warm-up y tope:', n);
  console.log('[Round] Slice final:', groupsThisRound.length);

  const roundStartedAt = new Date().toISOString();
  let roundPublished = 0;
  let roundSkipped = 0;

  const slotIndex = parseInt(store.get('lastSlotUsed') || '0', 10) % activeSlots.length;
  const slot = activeSlots[slotIndex];
  store.set('lastSlotUsed', String((slotIndex + 1) % activeSlots.length));

  for (let gi = 0; gi < groupsThisRound.length; gi++) {
    const group = groupsThisRound[gi];
    if (state.paused || !state.running) break;
    if (!canPostToday(rules)) {
      state.paused = true;
      break;
    }

    const total = groupsThisRound.length;
    const gname = group.name || String(group.id);
    const displayName = group.name || group.id;

    // Intervalo mínimo entre publicaciones en el mismo grupo (= intervalo base del usuario, en horas)
    const statsNow = store.get('stats') || {};
    const glMap =
      statsNow.groupLastPost && typeof statsNow.groupLastPost === 'object'
        ? statsNow.groupLastPost
        : {};
    const lastPostTime = Number(glMap[String(group.id)]) || 0;
    const nowMs = Date.now();
    const minHoursBetweenPosts = (Number(rules.intervalBaseMinutes) || 60) / 60;
    const hoursSinceLastPost =
      lastPostTime > 0 ? (nowMs - lastPostTime) / 3600000 : Infinity;

    if (lastPostTime > 0 && hoursSinceLastPost < minHoursBetweenPosts) {
      const totalMinSince = Math.floor((nowMs - lastPostTime) / 60000);
      const recentAgoH = Math.floor(totalMinSince / 60);
      const recentAgoM = totalMinSince % 60;
      const remainingMs = lastPostTime + minHoursBetweenPosts * 3600000 - nowMs;
      const nextTotalMin = Math.max(0, Math.ceil(remainingMs / 60000));
      const recentNextH = Math.floor(nextTotalMin / 60);
      const recentNextM = nextTotalMin % 60;

      console.log(
        `[Round] ⏭ Grupo ${gname} — publicado hace ${hoursSinceLastPost.toFixed(1)}h, mínimo ${minHoursBetweenPosts}h`
      );
      writeLog('INFO', 'Scheduler: grupo saltado — intervalo mínimo no cumplido', {
        groupId: group.id,
        groupName: gname,
        hoursSinceLastPost,
        minHoursBetweenPosts,
      });
      progressPayload({
        groupName: displayName,
        groupIndex: gi + 1,
        totalGroups: total,
        status: 'skipped',
        skipDetail: 'already_posted_recently',
        reason: 'already_posted_recently',
        message: 'skipped_already_recent',
        recentAgoH,
        recentAgoM,
        recentNextH,
        recentNextM,
      });
      const historySkip = store.get('history') || [];
      historySkip.unshift({
        at: new Date().toISOString(),
        groupId: group.id,
        groupName: group.name,
        copy: (slot.text || '').slice(0, 120),
        image: slot.imagePath || '',
        result: 'skipped_already_recent',
        recentAgoH,
        recentAgoM,
        recentNextH,
        recentNextM,
      });
      store.set('history', historySkip.slice(0, 500));
      continue;
    }

    console.log(`[Round] Procesando grupo ${gi + 1}/${groupsThisRound.length}`);

    progressPayload({
      groupName: gname,
      groupIndex: gi + 1,
      totalGroups: total,
      groupId: group.id,
      status: 'posting',
      message: 'publicando',
    });

    // Un await tras otro: sin Promise.all ni map async
    let res;
    const groupStartedAt = Date.now();
    try {
      res = await publishToGroup(accountId, group.id, {
        text: slot.text || '',
        imagePath: slot.imagePath || '',
      });
    } catch (err) {
      console.error('[Round] Excepción al publicar en grupo:', gname, err?.message || err);
      writeLog('ERROR', 'Scheduler publishToGroup', {
        groupId: group.id,
        groupName: gname,
        message: err?.message || String(err),
        durationMs: Date.now() - groupStartedAt,
      });
      res = { ok: false, reason: err?.message || 'error' };
    }
    const groupDurationMs = Date.now() - groupStartedAt;
    writeLog('INFO', 'Scheduler: publishToGroup timing', {
      groupId: group.id,
      groupName: gname,
      durationMs: groupDurationMs,
      durationSec: Math.round(groupDurationMs / 1000),
      ok: !!res.ok,
      reason: res.reason || null,
    });

    // Restricción de Facebook: pausa 24 h, persiste en store y notifica al renderer
    if (res.reason === 'facebook_restriction' || res.pauseBot) {
      const until = Date.now() + FACEBOOK_RESTRICTION_MS;
      state.paused = true;
      state.restrictionDetected = true;
      state.restrictionUntil = until;
      store.set('bot.restrictionUntil', until);
      store.set('campaign', {
        ...(store.get('campaign') || {}),
        status: 'paused',
      });
      writeLog('ERROR', 'Scheduler: restricción Facebook — bot en pausa 24 h', {
        groupId: group.id,
        groupName: gname,
      });
      progressPayload({
        status: 'restriction_detected',
        message:
          'Facebook detectó actividad inusual. Bot pausado 24 horas automáticamente.',
        restrictionUntil: until,
      });
      const histR = store.get('history') || [];
      histR.unshift({
        at: new Date().toISOString(),
        groupId: group.id,
        groupName: group.name,
        copy: (slot.text || '').slice(0, 120),
        image: slot.imagePath || '',
        result: 'facebook_restriction',
      });
      store.set('history', histR.slice(0, 500));
      console.log('[Round] 🚨 Restricción Facebook — ronda detenida, bot en pausa 24 h');
      break;
    }

    const skipRound = !res.ok && SKIP_ROUND_REASONS.has(res.reason);
    console.log(
      `[Round] Grupo ${gi + 1} resultado:`,
      res.ok ? 'OK' : skipRound ? `saltado (${res.reason})` : res.reason || res.detail || 'error'
    );

    if (skipRound) {
      if (SKIP_MARKETPLACE_STORE_REASONS.has(res.reason)) {
        markGroupMembershipMarketplace(store, group.id);
      } else if (res.reason === 'not_member') {
        markGroupNotMember(store, group.id);
      } else if (SKIP_PENDING_STORE_REASONS.has(res.reason)) {
        markGroupPending(store, group.id);
      }
      writeLog('INFO', 'Scheduler: grupo saltado (sin publicar en esta ronda)', {
        groupId: group.id,
        reason: res.reason,
      });
      const isMp = SKIP_MARKETPLACE_STORE_REASONS.has(res.reason);
      const isNotMember = res.reason === 'not_member';
      progressPayload({
        groupName: displayName,
        groupIndex: gi + 1,
        totalGroups: groupsThisRound.length,
        status: 'skipped',
        reason: res.reason,
        skipDetail: isMp ? 'marketplace' : isNotMember ? 'not_member' : 'pending',
        message: isMp ? 'skipped_marketplace' : isNotMember ? 'skipped_not_member' : 'skipped_pending',
      });
    } else {
      progressPayload({
        groupName: displayName,
        groupIndex: gi + 1,
        totalGroups: groupsThisRound.length,
        status: res.ok ? 'success' : 'error',
        message: res.ok ? `Publicado en ${displayName}` : `Error en ${displayName}`,
        reason: res.reason,
      });
    }

    const history = store.get('history') || [];
    history.unshift({
      at: new Date().toISOString(),
      groupId: group.id,
      groupName: group.name,
      copy: (slot.text || '').slice(0, 120),
      image: slot.imagePath || '',
      result: res.ok
        ? 'ok'
        : skipRound
          ? SKIP_MARKETPLACE_STORE_REASONS.has(res.reason)
            ? 'skipped_marketplace'
            : 'skipped_pending'
          : res.reason || 'error',
    });
    store.set('history', history.slice(0, 500));

    if (res.reason === 'captcha') {
      writeLog('ERROR', 'Captcha detectado — pausando bot');
      state.paused = true;
      break;
    }
    if (res.ok) {
      roundPublished++;
      bumpPostCount();
      markGroupLastPost(store, group.id);
      console.log(`[Round] ✅ Marcado último post en grupo (intervalo): ${gname}`);
    } else if (skipRound) {
      roundSkipped++;
    }

    // Pausa aleatoria entre grupos (MEJORA 5): 20–50 s para comportamiento más humano
    if (
      !skipRound &&
      gi < groupsThisRound.length - 1 &&
      state.running &&
      !state.paused
    ) {
      console.log('[Round] Esperando entre grupos...');
      await randomDelay(20_000, 50_000);
    }
  }

  if (groupsThisRound.length > 0 && state.running && !state.paused) {
    const delayMs = computeNextDelayMs(getEffectiveRules(store));
    // Resumen de ronda (MEJORA 4 + 1): datos para log y notificación nativa
    progressPayload({
      status: 'round_summary',
      published: roundPublished,
      skipped: roundSkipped,
      total: groupsThisRound.length,
      roundStartedAt,
      roundEndedAt: new Date().toISOString(),
      nextDelayMs: delayMs,
    });
    progressPayload({
      groupName: '',
      groupIndex: groupsThisRound.length,
      totalGroups: groupsThisRound.length,
      status: 'waiting',
      nextDelayMs: delayMs,
      message: 'next_round',
    });
  }
}

/**
 * Inicia el programador: primera ronda al instante; el cron solo corre cuando pasa el intervalo.
 */
export async function startScheduler(accountId = 'default', onTick, onProgress) {
  stopScheduler();

  state.running = true;
  state.paused = false;
  currentAccountId = accountId;
  onProgressReport = typeof onProgress === 'function' ? onProgress : null;

  const store = getStore();
  if (!store.get('warmUpStartDate')) {
    store.set('warmUpStartDate', new Date().toISOString());
  }

  console.log('[Scheduler] Iniciando - primera ronda INMEDIATA');
  writeLog('INFO', 'Scheduler: primera ronda inmediata');

  // Primera ronda sin esperar al cron ni al intervalo
  try {
    await runRound(currentAccountId);
  } catch (err) {
    console.error('[Scheduler] Error en primera ronda:', err.message);
    writeLog('ERROR', 'Scheduler primera ronda', { message: err.message });
  }

  const rules = getEffectiveRules(getStore());
  const delay = calculateNextDelay(rules);
  state.currentRoundIntervalMs = delay;
  nextRunTimestamp = Date.now() + delay;
  state.nextRunAt = new Date(nextRunTimestamp);

  if (typeof onTick === 'function') {
    onTick({
      status: 'waiting',
      nextRunAt: state.nextRunAt,
      nextDelayMs: delay,
    });
  }

  // Cron cada minuto: solo ejecuta si ya pasó nextRunTimestamp
  cronJob = cron.schedule('* * * * *', async () => {
    if (!state.running || state.paused) return;
    if (Date.now() < nextRunTimestamp) return;

    state.lastTick = new Date();
    try {
      await runRound(currentAccountId);
      const rulesNow = getEffectiveRules(getStore());
      const newDelay = calculateNextDelay(rulesNow);
      state.currentRoundIntervalMs = newDelay;
      nextRunTimestamp = Date.now() + newDelay;
      state.nextRunAt = new Date(nextRunTimestamp);
      if (typeof onTick === 'function') {
        onTick({
          status: 'waiting',
          nextRunAt: state.nextRunAt,
          nextDelayMs: newDelay,
        });
      }
    } catch (err) {
      console.error('[Scheduler] Error en ronda:', err.message);
      writeLog('ERROR', 'Scheduler tick', { message: err.message });
    }
  });

  writeLog('INFO', 'Scheduler iniciado');
}

export function pauseScheduler() {
  state.paused = true;
  writeLog('INFO', 'Scheduler pausado');
}

export function resumeScheduler() {
  if (getFacebookRestrictionBlockInfo().blocked) {
    writeLog('WARN', 'Scheduler: reanudar cancelado — restricción Facebook activa');
    return false;
  }
  state.paused = false;
  writeLog('INFO', 'Scheduler reanudado');
  return true;
}

export function stopScheduler() {
  state.running = false;
  state.paused = false;
  state.restrictionDetected = false;
  state.restrictionUntil = null;
  nextRunTimestamp = 0;
  state.nextRunAt = null;
  onProgressReport = null;
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  writeLog('INFO', 'Scheduler detenido');
}

export function getSchedulerState() {
  const store = getStore();
  const fb = getFacebookRestrictionBlockInfo(store);
  return {
    ...state,
    nextRunAt: state.nextRunAt ? state.nextRunAt.toISOString() : null,
    restrictionUntil: fb.blocked ? fb.until : null,
    restrictionActive: fb.blocked,
  };
}
