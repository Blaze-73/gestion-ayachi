import {
  BookOpenText, ClipboardCheck, FolderUp, GraduationCap, Home,
  ListChecks, Moon, NotebookPen, Save, Sun, TriangleAlert, UserPlus, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Attendance from './components/Attendance'
import Grades from './components/Grades'
import Groups from './components/Groups'
import Onboarding from './components/Onboarding'
import Payments from './components/Payments'
import Students from './components/Students'
import ToastHost from './components/ToastHost'
import { absentStudentsForDate, attendanceRateForMonth, countStudents, exportBinary, getDb, groupsForWeekday, importBinary, listGroups, listStudents, monthISO, paidTotalForMonth, paymentsForMonth, recentStudents, todayISO, unpaidCount } from './lib/db'
import { confirmDialog } from './lib/toast'
import type { TabKey } from './lib/types'

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Accueil', Icon: Home },
  { key: 'eleves', label: 'Élèves', Icon: GraduationCap },
  { key: 'groupes', label: 'Groupes', Icon: Users },
  { key: 'presences', label: 'Présences', Icon: ClipboardCheck },
  { key: 'paiements', label: 'Paiements', Icon: Wallet },
  { key: 'notes', label: 'Notes', Icon: NotebookPen },
]

const BACKUP_KEY = 'gestion-ayachi-last-backup'
const BACKUP_INTERVAL = 14 * 24 * 60 * 60 * 1000 // 14 jours

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [nbEleves, setNbEleves] = useState(0)
  const [impayes, setImpayes] = useState(0)
  const [impayeList, setImpayeList] = useState<string[]>([])
  const [showBackupReminder, setShowBackupReminder] = useState(false)
  const [backupDismissed, setBackupDismissed] = useState(false)
  const [absentsToday, setAbsentsToday] = useState<{ prenom: string; nom: string }[]>([])
  const [recentList, setRecentList] = useState<{ prenom: string; nom: string }[]>([])
  const [todayGroups, setTodayGroups] = useState<{ id: number; nom: string; matiere: string; heure: string }[]>([])
  const [attendanceGroupId, setAttendanceGroupId] = useState<number | null>(null)
  const [presenceRate, setPresenceRate] = useState<number | null>(null)
  const [collected, setCollected] = useState(0)
  const [weekGroups, setWeekGroups] = useState<{ jour: string; nom: string; matiere: string; heure: string }[]>([])
  const [onboarding, setOnboarding] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = t
    return t
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    getDb()
      .then(() => {
        setReady(true)
        // Assistant de première utilisation : base vide + jamais terminé
        setOnboarding(
          localStorage.getItem('onboarding-done') !== '1'
          && countStudents() === 0
          && listGroups().length === 0,
        )
        setNbEleves(countStudents())
        const m = monthISO()
        setImpayes(unpaidCount(m))
        setImpayeList(
          listStudents('')
            .filter((s) => (paymentsForMonthOf(s.id, m) ?? 'impaye') === 'impaye')
            .slice(0, 8)
            .map((s) => `${s.prenom} ${s.nom}`),
        )
        // Absents today
        setAbsentsToday(absentStudentsForDate(todayISO()))
        // Recent students
        setRecentList(recentStudents(3).map((s) => ({ prenom: s.prenom, nom: s.nom })))
        // Groups scheduled today
        const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        setTodayGroups(groupsForWeekday(JOURS_SEMAINE[new Date().getDay()]))
        // Presence rate + collected this month
        const rate = attendanceRateForMonth(m)
        setPresenceRate(rate.total > 0 ? Math.round((rate.presents / rate.total) * 100) : null)
        setCollected(paidTotalForMonth(m))
        // Week schedule
        const ORDER = ['Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        const dayIdx = (j: string) => { const i = ORDER.indexOf(j); return i === -1 ? 99 : i }
        setWeekGroups(
          listGroups()
            .slice()
            .sort((a, b) => dayIdx(a.jour) - dayIdx(b.jour) || a.heure.localeCompare(b.heure))
            .map((g) => ({ jour: g.jour, nom: g.nom, matiere: g.matiere, heure: g.heure })),
        )
        // Backup reminder
        const last = localStorage.getItem(BACKUP_KEY)
        const lastTime = last ? Number(last) : 0
        if (Date.now() - lastTime > BACKUP_INTERVAL) setShowBackupReminder(true)
      })
      .catch((e) => setError(String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, refreshKey])

  const finishOnboarding = () => {
    localStorage.setItem('onboarding-done', '1')
    setOnboarding(false)
    setRefreshKey((k) => k + 1)
  }

  if (error) return <div className="loading">Erreur : {error}</div>
  if (!ready) return <div className="loading">Chargement de la base locale…</div>
  if (onboarding) return (<><Onboarding onDone={finishOnboarding} /><ToastHost /></>)

  const backup = () => {
    const data = exportBinary()
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/x-sqlite3' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gestion-ayachi-${new Date().toISOString().slice(0, 10)}.db`
    a.click()
    URL.revokeObjectURL(a.href)
    localStorage.setItem(BACKUP_KEY, String(Date.now()))
    setShowBackupReminder(false)
  }

  const restore = async (f: File | undefined) => {
    if (!f) return
    if (!(await confirmDialog('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.'))) return
    await importBinary(new Uint8Array(await f.arrayBuffer()))
    location.reload()
  }

  return (
    <>
      <div className="topbar">
        <BookOpenText size={26} color="var(--primary)" />
        <div>
          <h1>Gestion Ayachi</h1>
          <div className="sub">Suivi des élèves — 100 % hors-ligne, données sur ce PC</div>
        </div>
        <div style={{ marginLeft: 'auto' }} className="row no-print">
          <button
            className="small"
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={15} className="btn-ico" /> : <Moon size={15} className="btn-ico" />}
          </button>
          <button className="small" onClick={backup}><Save size={15} className="btn-ico" />Sauvegarde</button>
          <label className="small" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>
            <FolderUp size={15} className="btn-ico" />Restaurer
            <input type="file" accept=".db,.sqlite,.sqlite3" hidden onChange={(e) => void restore(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {showBackupReminder && !backupDismissed && (
        <div className="backup-banner no-print">
          <span>Pensez à sauvegarder vos données (Sauvegarde en haut à droite).</span>
          <button className="small" onClick={() => setBackupDismissed(true)}> compris</button>
        </div>
      )}

      <nav className="tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => { if (key === 'presences') setAttendanceGroupId(null); setTab(key) }}>
            <Icon size={17} className="btn-ico" />{label}
          </button>
        ))}
      </nav>

      <main key={tab} className="tab-view">
        {tab === 'dashboard' && (
          <>
            <div className="cards">
              <div className="stat"><div className="n">{nbEleves}</div><div className="l">Élèves inscrits</div></div>
              <div className="stat"><div className="n">{impayes}</div><div className="l">Impayés ({monthISO()})</div></div>
              <div className="stat">
                <div className="n">{presenceRate !== null ? `${presenceRate}%` : '—'}</div>
                <div className="l">Présence ({monthISO()})</div>
              </div>
              <div className="stat">
                <div className="n">{collected} DA</div>
                <div className="l">Encaissé ({monthISO()})</div>
              </div>
            </div>
            <div className="panel">
              <h2>Cours d'aujourd'hui</h2>
              {todayGroups.length === 0 ? (
                <p className="muted">Aucun cours prévu aujourd'hui.</p>
              ) : (
                <div className="today-groups">
                  {todayGroups.map((g) => (
                    <div key={g.id} className="today-group-row">
                      <div className="today-group-info">
                        <strong>{g.nom}</strong>
                        <span className="muted">{g.heure || '—'}{g.matiere ? ` · ${g.matiere}` : ''}</span>
                      </div>
                      <button className="small primary" onClick={() => { setAttendanceGroupId(g.id); setTab('presences') }}>
                        <ListChecks size={14} className="btn-ico" />Faire l'appel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {weekGroups.length > 0 && (
              <div className="panel">
                <h2>Emploi de la semaine</h2>
                <div className="today-groups">
                  {weekGroups.map((g, i) => (
                    <div key={i} className="today-group-row">
                      <div className="today-group-info">
                        <strong>{g.nom}</strong>
                        <span className="muted">{g.jour} {g.heure || '—'}{g.matiere ? ` · ${g.matiere}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="panel">
              <h2>Bienvenue</h2>
              <p className="muted">
                1. Ajoutez vos <strong>groupes</strong> (jour + heure). 2. Inscrivez les <strong>élèves</strong> avec photo.
                3. Faites l'appel dans <strong>présences</strong>, suivez l'argent dans <strong>paiements</strong>,
                les résultats dans <strong>notes</strong>. Le bouton <strong>Fiche</strong> imprime le dossier d'un élève.
              </p>
              <div className="row">
                <button className="primary" onClick={() => setTab('eleves')}><UserPlus size={16} className="btn-ico" />Ajouter un élève</button>
                <button onClick={() => { setAttendanceGroupId(null); setTab('presences') }}><ListChecks size={16} className="btn-ico" />Faire l'appel</button>
              </div>
            </div>
            {impayeList.length > 0 && (
              <div className="panel">
                <h2><TriangleAlert size={18} className="btn-ico" />À relancer ({monthISO()})</h2>
                <p>{impayeList.join(' • ')}</p>
              </div>
            )}
            {absentsToday.length > 0 && (
              <div className="panel">
                <h2>Absents aujourd'hui</h2>
                <p>{absentsToday.map((s) => `${s.prenom} ${s.nom}`).join(' • ')}</p>
              </div>
            )}
            {recentList.length > 0 && (
              <div className="panel">
                <h2>Derniers élèves inscrits</h2>
                <p>{recentList.map((s) => `${s.prenom} ${s.nom}`).join(' • ')}</p>
              </div>
            )}
          </>
        )}
        {tab === 'eleves' && <Students />}
        {tab === 'groupes' && <Groups />}
        {tab === 'presences' && <Attendance key={attendanceGroupId ?? 'none'} initialGroupId={attendanceGroupId} />}
        {tab === 'paiements' && <Payments />}
        {tab === 'notes' && <Grades />}
      </main>
      <ToastHost />
    </>
  )
}

function paymentsForMonthOf(studentId: number, mois: string): string | undefined {
  return paymentsForMonth(mois).find((p) => p.student_id === studentId)?.statut
}
