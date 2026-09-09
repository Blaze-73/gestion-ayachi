// Preload — pont securise entre l'app React et le fichier SQLite local.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('papaAPI', {
  isDesktop: true,
  loadDb: () => ipcRenderer.invoke('db:load'),
  saveDb: (bytes) => ipcRenderer.invoke('db:save', bytes),
  dbPath: () => ipcRenderer.invoke('db:path'),
  loadWasm: () => ipcRenderer.invoke('db:wasm'),
})
