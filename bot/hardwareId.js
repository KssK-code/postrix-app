/**
 * Genera un Hardware ID estable: CPU, placa, disco, MAC → SHA256 → HW-XXXXXXXX-CC
 * (CC = país por IP; si falla, XX).
 */
import { createHash } from 'crypto';
import { networkInterfaces } from 'os';
import axios from 'axios';
import si from 'systeminformation';
import machineIdPkg from 'node-machine-id';

const { machineIdSync } = machineIdPkg;

/**
 * Obtiene la MAC principal (primera interfaz no interna con MAC válida).
 */
function getPrimaryMac() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        return net.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
}

/**
 * Código de país ISO2 vía API pública (sin API key).
 */
async function getCountryCode() {
  try {
    const { data } = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
    if (data?.country_code) return String(data.country_code).slice(0, 2).toUpperCase();
  } catch {
    try {
      const { data } = await axios.get('https://ip-api.com/json/?fields=countryCode', { timeout: 5000 });
      if (data?.countryCode) return String(data.countryCode).slice(0, 2).toUpperCase();
    } catch {
      /* ignorar */
    }
  }
  return 'XX';
}

/**
 * Construye cadena única con datos de hardware y la hashea con SHA256.
 */
async function buildHardwareFingerprint() {
  const cpu = await si.cpu();
  const baseboard = await si.baseboard();
  const disks = await si.diskLayout();
  const firstDisk = disks[0]?.serialNum || disks[0]?.name || 'nodisk';
  const mac = getPrimaryMac();
  let machineId = '';
  try {
    machineId = machineIdSync(true);
  } catch {
    machineId = 'fallback-machine';
  }

  const raw = [
    cpu.manufacturer || '',
    cpu.brand || '',
    cpu.processors?.toString() || '',
    baseboard.manufacturer || '',
    baseboard.model || '',
    firstDisk,
    mac,
    machineId,
  ].join('|');

  const hash = createHash('sha256').update(raw, 'utf8').digest('hex');
  return hash;
}

/**
 * ID con formato HW-XXXXXXXX-CC (async por detección de país).
 */
export async function getHardwareId() {
  const hash = await buildHardwareFingerprint();
  const short = hash.slice(0, 8).toUpperCase();
  const country = await getCountryCode();
  return `HW-${short}-${country}`;
}

/**
 * Versión síncrona sin país (solo para fallback de arranque offline).
 */
export function getHardwareIdSync() {
  const mac = getPrimaryMac();
  const raw = `sync|${mac}|${process.env.COMPUTERNAME || 'pc'}`;
  const hash = createHash('sha256').update(raw, 'utf8').digest('hex');
  return `HW-${hash.slice(0, 8).toUpperCase()}-XX`;
}
