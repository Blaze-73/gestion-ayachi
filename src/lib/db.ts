// Couche SQLite — Gestion Papa
// - Sous Electron (appli de papa) : sql.js + fichier gestion.db dans les donnees de l'app.
// - Dans le navigateur : sql.js + localStorage (secours).
// Meme schema repris tel quel sous Tauri (tauri-plugin-sql, sqlite:gestion.db).

import initSqlJs, { type Database } from 'sql.js'
import type { AttendanceRow, GradeRow, Group, PaymentRow, Student } from './types'

declare global {
  interface Window {
    papaAPI?: {
      isDesktop: boolean
      loadDb: () => Promise<number[] | null>
      saveDb: (bytes: number[]) => Promise<boolean>
      dbPath: () => Promise<string>
      loadWasm: () => Promise<number[]>
    }
  }
}

const STORAGE_KEY = 'gestion-papa-sqlite-v1'
const isDesktop = () => typeof window !== 'undefined' && !!window.papaAPI?.isDesktop

/** Ou se trouve la base ? (affiche dans la console + utilisable pour le support) */
export async function dbLocation(): Promise<string> {
  if (isDesktop()) {
    try {
      return await window.papaAPI!.dbPath()
    } catch {
      return 'dossier de l’application'
    }
  }
  return 'stockage local du navigateur (cle ' + STORAGE_KEY + ')'
}

let db: Database | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  matiere TEXT DEFAULT '',
  jour TEXT DEFAULT '',
  heure TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT DEFAULT '',
  naissance TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  parent_tel TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  groupe_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  inscription_date TEXT DEFAULT '',
  remarques TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'present',
  UNIQUE(student_id, date)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mois TEXT NOT NULL,
  montant REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'impaye',
  date_paiement TEXT DEFAULT '',
  UNIQUE(student_id, mois)
);
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  evaluation TEXT DEFAULT '',
  note REAL NOT NULL DEFAULT 0,
  date TEXT DEFAULT ''
);
`

function persistSoon() {
  // Sous Electron on écrit tout de suite : si on attend 150 ms et que
  // papa ferme la fenêtre vite, la dernière modif est perdue.
  if (isDesktop()) {
    persistNow()
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistNow, 150)
}

/** Force l'écriture immédiate (appelé à la fermeture : on ne peut pas attendre). */
function flushSync() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  persistNow()
}

let flushHooked = false
function hookFlushOnClose() {
  if (flushHooked || typeof window === 'undefined') return
  flushHooked = true
  // pagehide couvre la fermeture Electron + onglet navigateur ; beforeunload en renfort.
  window.addEventListener('pagehide', flushSync)
  window.addEventListener('beforeunload', flushSync)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSync()
  })
}

function persistNow() {
  if (!db) return
  try {
    const data = db.export()
    if (isDesktop()) {
      // Ecriture directe dans gestion.db — sans bloquer l'interface
      void window.papaAPI!.saveDb(Array.from(data))
      return
    }
    let bin = ''
    for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i])
    localStorage.setItem(STORAGE_KEY, btoa(bin))
  } catch {
    // stockage plein (photos) : on ignore, l'export manuel reste possible
  }
}

async function restoreFromDesktop(): Promise<Uint8Array | undefined> {
  try {
    const arr = await window.papaAPI!.loadDb()
    if (!arr || arr.length === 0) return undefined
    return new Uint8Array(arr)
  } catch {
    return undefined
  }
}

function restore(): Uint8Array | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const bin = atob(raw)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return arr
  } catch {
    return undefined
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db
  let SQL
  if (isDesktop()) {
    // Sous Electron (file://) fetch() est bloque : on passe les octets lus par le main.
    const bytes = await window.papaAPI!.loadWasm()
    SQL = await initSqlJs({ wasmBinary: new Uint8Array(bytes).buffer as ArrayBuffer })
  } else {
    SQL = await initSqlJs({ locateFile: () => 'sql-wasm.wasm' })
  }
  let dbInstance: Database
  const saved = isDesktop() ? await restoreFromDesktop() : restore()
  if (saved) {
    try {
      dbInstance = new SQL.Database(saved)
    } catch {
      // fichier corrompu → on repart de zéro silencieusement
      dbInstance = new SQL.Database()
    }
  } else {
    dbInstance = new SQL.Database()
  }
  db = dbInstance
  db.exec(SCHEMA)
  db.exec('PRAGMA foreign_keys = ON;')
  hookFlushOnClose()
  return db
}

function all<T>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('DB non initialisee')
  const stmt = db.prepare(sql)
  stmt.bind(params as never[])
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

function run(sql: string, params: unknown[] = []): number {
  if (!db) throw new Error('DB non initialisee')
  db.run(sql, params as never[])
  persistSoon()
  const id = all<{ id: number }>('SELECT last_insert_rowid() AS id')[0]?.id ?? 0
  return id
}

// ---------- Groupes ----------
export const listGroups = () => all<Group>('SELECT * FROM groups ORDER BY nom')
export const addGroup = (g: Omit<Group, 'id'>) =>
  run('INSERT INTO groups (nom, matiere, jour, heure) VALUES (?,?,?,?)', [g.nom, g.matiere, g.jour, g.heure])
export const updateGroup = (g: Group) =>
  void run('UPDATE groups SET nom=?, matiere=?, jour=?, heure=? WHERE id=?', [g.nom, g.matiere, g.jour, g.heure, g.id])
export const deleteGroup = (id: number) => void run('DELETE FROM groups WHERE id=?', [id])

// ---------- Eleves ----------
export const listStudents = (q = '') => {
  const like = `%${q.trim().toLowerCase()}%`
  if (!q.trim()) return all<Student>('SELECT * FROM students ORDER BY nom, prenom')
  return all<Student>(
    'SELECT * FROM students WHERE lower(nom || \' \' || prenom || \' \' || tel) LIKE ? ORDER BY nom, prenom',
    [like],
  )
}
export const getStudent = (id: number) => all<Student>('SELECT * FROM students WHERE id=?', [id])[0]
export const studentsByGroup = (groupeId: number) =>
  all<Student>('SELECT * FROM students WHERE groupe_id=? ORDER BY nom, prenom', [groupeId])

export const addStudent = (s: Omit<Student, 'id'>) =>
  run(
    'INSERT INTO students (nom, prenom, naissance, tel, parent_tel, adresse, photo, groupe_id, inscription_date, remarques) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [s.nom, s.prenom, s.naissance, s.tel, s.parent_tel, s.adresse, s.photo, s.groupe_id, s.inscription_date, s.remarques],
  )
export const updateStudent = (s: Student) =>
  void run(
    'UPDATE students SET nom=?, prenom=?, naissance=?, tel=?, parent_tel=?, adresse=?, photo=?, groupe_id=?, inscription_date=?, remarques=? WHERE id=?',
    [s.nom, s.prenom, s.naissance, s.tel, s.parent_tel, s.adresse, s.photo, s.groupe_id, s.inscription_date, s.remarques, s.id],
  )
export const deleteStudent = (id: number) => void run('DELETE FROM students WHERE id=?', [id])
export const countStudents = () => all<{ n: number }>('SELECT COUNT(*) AS n FROM students')[0]?.n ?? 0

// ---------- Presences ----------
export const attendanceForDate = (date: string) =>
  all<AttendanceRow>('SELECT * FROM attendance WHERE date=?', [date])
export const markAttendance = (studentId: number, date: string, statut: 'present' | 'absent') =>
  void run(
    'INSERT INTO attendance (student_id, date, statut) VALUES (?,?,?) ON CONFLICT(student_id, date) DO UPDATE SET statut=excluded.statut',
    [studentId, date, statut],
  )
export const attendanceForStudent = (studentId: number) =>
  all<AttendanceRow>('SELECT * FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 20', [studentId])

// ---------- Paiements ----------
export const paymentsForMonth = (mois: string) =>
  all<PaymentRow>('SELECT * FROM payments WHERE mois=?', [mois])
export const setPayment = (studentId: number, mois: string, montant: number, statut: 'paye' | 'impaye', datePaiement: string) =>
  void run(
    'INSERT INTO payments (student_id, mois, montant, statut, date_paiement) VALUES (?,?,?,?,?) ON CONFLICT(student_id, mois) DO UPDATE SET montant=excluded.montant, statut=excluded.statut, date_paiement=excluded.date_paiement',
    [studentId, mois, montant, statut, datePaiement],
  )
export const paymentsForStudent = (studentId: number) =>
  all<PaymentRow>('SELECT * FROM payments WHERE student_id=? ORDER BY mois DESC LIMIT 12', [studentId])
export const unpaidCount = (mois: string) =>
  all<{ n: number }>("SELECT COUNT(*) AS n FROM payments WHERE mois=? AND statut='impaye'", [mois])[0]?.n ?? 0

// ---------- Notes ----------
export const gradesForStudent = (studentId: number) =>
  all<GradeRow>('SELECT * FROM grades WHERE student_id=? ORDER BY date DESC', [studentId])
export const addGrade = (g: Omit<GradeRow, 'id'>) =>
  run('INSERT INTO grades (student_id, evaluation, note, date) VALUES (?,?,?,?)', [g.student_id, g.evaluation, g.note, g.date])
export const deleteGrade = (id: number) => void run('DELETE FROM grades WHERE id=?', [id])
export const averageForStudent = (studentId: number) => {
  const r = all<{ m: number | null }>('SELECT AVG(note) AS m FROM grades WHERE student_id=?', [studentId])[0]
  return r?.m ?? null
}

// ---------- Sauvegarde / restauration ----------
export function exportBinary(): Uint8Array {
  if (!db) throw new Error('DB non initialisee')
  return db.export()
}

export async function importBinary(data: Uint8Array) {
  const SQL = await initSqlJs({ locateFile: () => 'sql-wasm.wasm' })
  if (db) db.close()
  db = new SQL.Database(data)
  db.exec(SCHEMA)
  persistNow()
}

/** Compresse une photo (fichier) en dataURL JPEG max 400px — ideal pour SQLite local. */
export function fileToPhotoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 400
      const ratio = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const monthISO = () => new Date().toISOString().slice(0, 7)
