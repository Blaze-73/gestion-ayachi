import { useEffect, useState } from 'react'
import Attendance from './components/Attendance'
import Grades from './components/Grades'
import Groups from './components/Groups'
import Payments from './components/Payments'
import Students from './components/Students'
import { countStudents, exportBinary, getDb, importBinary, listStudents, monthISO, unpaidCount } from './lib/db'
import type { TabKey } from './lib/types'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: '🏠 Accueil' },
  { key: 'eleves', label: '👨‍🎓 Élèves' },
  { key: 'groupes', label: '👥 Groupes' },
  { key: 'presences', label: '✅ Présences' },
  { key: 'paiements', label: '💰 Paiements' },
  { key: 'notes', label: '📝 Notes' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [nbEleves, setNbEleves] = useState(0)
  const [impayes, setImpayes] = useState(0)
  const [impayeList, setImpayeList] = useState<string[]>([])

  useEffect(() => {
    getDb()
      .then(() => {
        setReady(true)
        setNbEleves(countStudents())
        const m = monthISO()
        setImpayes(unpaidCount(m))
        setImpayeList(
          listStudents('')
            .filter((s) => (paymentsForMonthOf(s.id, m) ?? 'impaye') === 'impaye')
            .slice(0, 8)
            .map((s) => `${s.prenom} ${s.nom}`),
        )
      })
      .catch((e) => setError(String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  if (error) return <div className="loading">Erreur : {error}</div>
  if (!ready) return <div className="loading">Chargement de la base locale…</div>

  const backup = () => {
    const data = exportBinary()
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/x-sqlite3' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gestion-papa-${new Date().toISOString().slice(0, 10)}.db`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const restore = async (f: File | undefined) => {
    if (!f) return
    if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return
    await importBinary(new Uint8Array(await f.arrayBuffer()))
    location.reload()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>📚 Gestion Papa</h1>
          <div className="sub">Suivi des élèves — 100 % hors-ligne, données sur ce PC</div>
        </div>
        <div style={{ marginLeft: 'auto' }} className="row no-print">
          <button className="small" onClick={backup}>💾 Sauvegarde</button>
          <label className="small" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>
            📥 Restaurer
            <input type="file" accept=".db,.sqlite,.sqlite3" hidden onChange={(e) => void restore(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && (
          <>
            <div className="cards">
              <div className="stat"><div className="n">{nbEleves}</div><div className="l">Élèves inscrits</div></div>
              <div className="stat"><div className="n">{impayes}</div><div className="l">Impayés ({monthISO()})</div></div>
            </div>
            <div className="panel">
              <h2>Bienvenue 👋</h2>
              <p className="muted">
                1. Ajoutez vos <strong>groupes</strong> (jour + heure). 2. Inscrivez les <strong>élèves</strong> avec photo.
                3. Faites l'appel dans <strong>présences</strong>, suivez l'argent dans <strong>paiements</strong>,
                les résultats dans <strong>notes</strong>. Bouton <strong>🖨️ Fiche</strong> pour imprimer le dossier d'un élève.
              </p>
              <div className="row">
                <button className="primary" onClick={() => setTab('eleves')}>Ajouter un élève</button>
                <button onClick={() => setTab('presences')}>Faire l'appel</button>
              </div>
            </div>
            {impayeList.length > 0 && (
              <div className="panel">
                <h2>⚠️ À relancer ({monthISO()})</h2>
                <p>{impayeList.join(' • ')}</p>
              </div>
            )}
          </>
        )}
        {tab === 'eleves' && <Students />}
        {tab === 'groupes' && <Groups />}
        {tab === 'presences' && <Attendance />}
        {tab === 'paiements' && <Payments />}
        {tab === 'notes' && <Grades />}
      </main>
    </>
  )
}

import { paymentsForMonth } from './lib/db'
function paymentsForMonthOf(studentId: number, mois: string): string | undefined {
  return paymentsForMonth(mois).find((p) => p.student_id === studentId)?.statut
}
