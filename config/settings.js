/**
 * Configuración persistente con electron-store (encriptación opcional de datos sensibles).
 */
import Store from 'electron-store';
import { createHash } from 'crypto';

/** Clave derivada para cifrar datos sensibles en disco (mejor: usar safeStorage en prod). */
function encryptionKey() {
  const base = process.env.POSTRIX_STORE_KEY || 'postrix-solvix-store-v1';
  return createHash('sha256').update(base).digest('base64').slice(0, 32);
}

const defaults = {
  licenseKey: '',
  language: 'es',
  /** Pausa por restricción de Facebook: timestamp ms cuando expira (0 = sin restricción) */
  bot: {
    restrictionUntil: 0,
  },
  groups: [],
  /** @type {Array<{id:string,name:string,email?:string,cookies?:string}>} */
  facebookAccounts: [],
  activeAccountId: '',
  campaign: {
    name: '',
    status: 'stopped',
    /** Ajustes rápidos en Mi Campaña (sesión; el scheduler los fusiona con rules) */
    session: {
      intervalHours: 3,
      hourStart: '09:00',
      hourEnd: '19:00',
      /** Por ronda: valor conservador por defecto (el tope global está en rules.maxGroupsPerRound) */
      maxGroupsPerRound: 20,
    },
  },
  /** 4 slots de contenido */
  contentSlots: [
    { id: '1', text: '', imagePath: '', active: true },
    { id: '2', text: '', imagePath: '', active: false },
    { id: '3', text: '', imagePath: '', active: false },
    { id: '4', text: '', imagePath: '', active: false },
  ],
  lastSlotUsed: null,
  history: [],
  rules: {
    hourStart: '09:00',
    hourEnd: '19:00',
    intervalBaseMinutes: 180,
    randomVariationMinutes: 20,
    /** Máximo permitido por ronda (límite duro; la sesión suele usar un valor menor) */
    maxGroupsPerRound: 60,
    maxPostsPerDay: 120,
    /** Warm-up gradual por defecto (7 días); el usuario puede desactivarlo en la app */
    warmUpEnabled: true,
    /** Días de descanso desactivados en la app; se mantiene [] por compatibilidad con tiendas antiguas */
    restDays: [],
  },
  notifications: {
    alertEmail: '',
  },
  stats: {
    postsToday: 0,
    lastPostDate: '',
    successRate: 0,
    /** { 'YYYY-MM-DD': número de ronda del día (rotación de grupos) } */
    roundIndexByDay: {},
    /** { 'YYYY-MM-DD': { [groupId]: true } } legado / estadística por día (opcional) */
    groupPostsByDay: {},
    /** { [groupId]: timestamp ms } última publicación OK por grupo (intervalo mínimo entre posts) */
    groupLastPost: {},
  },
  /** Fecha ISO de inicio warm-up (primer START del bot) */
  warmUpStartDate: '',
  /** Cookies de sesión Facebook (JSON string de array Playwright) */
  fb_session_cookies: '',
  /** Nombre detectado al conectar Facebook (login manual) */
  fb_user_name: '',
};

let storeInstance = null;

/**
 * Obtiene la instancia singleton de la tienda de configuración.
 */
export function getStore() {
  if (!storeInstance) {
    storeInstance = new Store({
      name: 'postrix-config',
      encryptionKey: encryptionKey(),
      defaults,
    });
  }
  return storeInstance;
}

/**
 * Reinicia la instancia (útil en tests).
 */
export function resetStoreForTests() {
  storeInstance = null;
}
