/**
 * Comunicación con el servidor de licencias (POST /activate, POST /check).
 */
import axios from 'axios';
import { getStore } from '../config/settings.js';

/**
 * URL base del servidor (sin barra final).
 * Preferimos 127.0.0.1 sobre localhost en Windows.
 */
export function getLicenseServerUrl() {
  const raw =
    process.env.LICENSE_SERVER_URL ||
    'https://postrix-license-server-production.up.railway.app';
  let u = String(raw).trim().replace(/\/$/, '');
  u = u.replace(/localhost/gi, '127.0.0.1');
  return u;
}

/**
 * Activa la licencia en el servidor y guarda la clave si tuvo éxito.
 */
export async function activateLicense(licenseKey, hardwareId) {
  const base = getLicenseServerUrl();
  const url = `${base}/activate`;
  const payload = {
    license_key: String(licenseKey || '').trim(),
    hardware_id: hardwareId,
  };
  console.log('[validator] Conectando a:', url);
  console.log('[validator] Payload:', payload);
  try {
    const { data } = await axios.post(url, payload, {
      timeout: 30000,
      validateStatus: () => true,
    });
    if (data?.success === true) {
      const store = getStore();
      store.set('licenseKey', payload.license_key);
      return { ok: true, data };
    }
    return { ok: false, reason: data?.reason || 'unknown', data };
  } catch (err) {
    console.error('[validator] Error de red:', err.message);
    return {
      ok: false,
      reason: 'network_error',
      message: err.message,
    };
  }
}

/** Alias usado por el proceso principal (misma lógica que activateLicense). */
export const validateLicense = activateLicense;

/**
 * Verifica licencia al arranque; devuelve estado y si hay update disponible.
 */
export async function checkLicense(licenseKey, hardwareId, currentVersion) {
  const base = getLicenseServerUrl();
  const url = `${base}/check`;
  const payload = {
    license_key: licenseKey,
    hardware_id: hardwareId,
    current_version: currentVersion || process.env.APP_VERSION || '1.0.0',
  };
  try {
    const { data } = await axios.post(url, payload, {
      timeout: 30000,
      validateStatus: () => true,
    });
    return {
      valid: data?.valid === true,
      reason: data?.reason ?? null,
      latest_version: data?.latest_version,
      update_available: data?.update_available === true,
      update_price_url: data?.update_price_url ?? null,
      raw: data,
    };
  } catch (err) {
    return {
      valid: false,
      reason: 'network_error',
      message: err.message,
      update_available: false,
      update_price_url: null,
    };
  }
}

/**
 * Devuelve la clave guardada en store (ya cifrada en disco por electron-store).
 */
export function getStoredLicenseKey() {
  return getStore().get('licenseKey') || '';
}
