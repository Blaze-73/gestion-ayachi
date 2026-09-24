// Gestion Ayachi — processus principal Electron.
// Fenetre unique, 100 % offline. En dev : http://localhost:1420, en prod : dist/.
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DB_NAME = 'gestion.db'
const dbPath = () => path.join(app.getPath('userData'), DB_NAME)

const isDev = !app.isPackaged

function createWindow() {
  const appIcon = path.join(__dirname, '..', 'build', 'icon.png')
  const win = new BrowserWindow({
    title: 'Gestion Ayachi — Suivi des élèves',
    icon: fs.existsSync(appIcon) ? appIcon : undefined,
    backgroundColor: '#f4f6fb',
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:1420')
    // win.webContents.openDevTools() // debug uniquement
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Les liens externes (s'il y en a) s'ouvrent dans le navigateur, pas dans l'app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

// --- Base SQLite persistee en fichier (au lieu du localStorage du navigateur) ---
ipcMain.handle('db:load', () => {
  try {
    if (!fs.existsSync(dbPath())) return null
    return Array.from(fs.readFileSync(dbPath()))
  } catch {
    return null
  }
})

ipcMain.handle('db:save', (_evt, bytes) => {
  try {
    fs.mkdirSync(path.dirname(dbPath()), { recursive: true })
    fs.writeFileSync(dbPath(), Buffer.from(bytes))
    return true
  } catch {
    return false
  }
})

ipcMain.handle('db:path', () => dbPath())

// --- WASM SQLite : le renderer ne peut pas faire fetch() en file://,
// donc le processus principal lit le fichier et envoie les octets ---
ipcMain.handle('db:wasm', () => {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'sql-wasm.wasm'),
    path.join(__dirname, '..', 'public', 'sql-wasm.wasm'),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return Array.from(fs.readFileSync(p))
    } catch {
      // essayer le suivant
    }
  }
  throw new Error('sql-wasm.wasm introuvable')
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
