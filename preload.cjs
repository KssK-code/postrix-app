/**
 * Preload en CommonJS — Electron usa require() aquí; no puede ser ESM (import).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('postrix', {
  getEnv: () => ipcRenderer.invoke('app:getEnv'),
  licenseStartupCheck: () => ipcRenderer.invoke('license:startupCheck'),
  activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  licenseActivate: (key) => ipcRenderer.invoke('license:activate', key),
  licenseCheck: () => ipcRenderer.invoke('license:check'),
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (patch) => ipcRenderer.invoke('settings:set', patch),
  /** Lectura directa de una clave del store (p. ej. fb_user_name, fb_session_cookies) */
  getStoreValue: (key) => ipcRenderer.invoke('store:get', key),
  groupsList: () => ipcRenderer.invoke('groups:list'),
  groupsSave: (list) => ipcRenderer.invoke('groups:save', list),
  groupsExtractIds: (text) => ipcRenderer.invoke('groups:extractIds', text),
  groupsSearch: (keyword) => ipcRenderer.invoke('groups:search', keyword),
  groupsVerifyMarketplace: (items) =>
    ipcRenderer.invoke('groups:verifyMarketplace', items),
  groupsImportTxt: () => ipcRenderer.invoke('groups:importTxt'),
  groupsExportTxt: () => ipcRenderer.invoke('groups:exportTxt'),
  historyExportCsv: () => ipcRenderer.invoke('history:exportCsv'),
  facebookConnect: () => ipcRenderer.invoke('facebook:connect'),
  /** Actualiza fb_user_name usando la sesión guardada (sin ventana de login). */
  facebookRefreshName: () => ipcRenderer.invoke('facebook:refreshName'),
  facebookDisconnect: () => ipcRenderer.invoke('facebook:disconnect'),
  botStart: () => ipcRenderer.invoke('bot:start'),
  botPause: () => ipcRenderer.invoke('bot:pause'),
  botResume: () => ipcRenderer.invoke('bot:resume'),
  botStop: () => ipcRenderer.invoke('bot:stop'),
  botState: () => ipcRenderer.invoke('bot:state'),
  selectImage: () => ipcRenderer.invoke('dialog:selectImage'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onBotTick: (cb) => ipcRenderer.on('bot:tick', (_, data) => cb(data)),
  onBotStatus: (cb) => ipcRenderer.on('bot:status', (_, data) => cb(data)),
  onBotProgress: (cb) => ipcRenderer.on('bot:progress', (_, data) => cb(data)),
  onGroupsSearchProgress: (cb) =>
    ipcRenderer.on('groups:searchProgress', (_, data) => cb(data)),
});
