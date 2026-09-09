// Gestion Papa — processus principal Electron.
// Fenetre unique, 100 % offline. En dev : http://localhost:1420, en prod : dist/.
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DB_NAME = 'gestion.db'
const dbPath = () => path.join(app.getPath('userData'), DB_NAME)

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    title: 'Gestion Papa — Suivi des élèves',
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

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
