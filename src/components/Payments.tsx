import { Check, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { distinctPaymentMonths, listStudents, monthISO, paymentsForMonth, setPayment, todayISO } from '../lib/db'
import type { Student } from '../lib/types'

export default function Payments() {
  const [mois, setMois] = useState(monthISO())
  const [students, setStudents] = useState<Student[]>([])
  const [rows, setRows] = useState<Record<number, { montant: string; statut: 'paye' | 'impaye' }>>({})
  const [dirty, setDirty] = useState<Record<number, boolean>>({})
  const [justSaved, setJustSaved] = useState<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [historyMonths, setHistoryMonths] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  const refresh = () => {
    setStudents(listStudents(''))
    const existing = paymentsForMonth(mois)
    const m: Record<number, { montant: string; statut: 'paye' | 'impaye' }> = {}
    for (const p of existing) m[p.student_id] = { montant: String(p.montant || ''), statut: p.statut }
    setRows(m)
    setDirty({})
    setHistoryMonths(distinctPaymentMonths().map((r) => r.mois))
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(refresh, [mois]) // eslint-disable-line react-hooks/exhaustive-deps

  const row = (id: number) => rows[id] ?? { montant: '', statut: 'impaye' as const }
  const edit = (id: number, patch: Partial<{ montant: string; statut: 'paye' | 'impaye' }>) => {
    setRows((r) => ({ ...r, [id]: { ...row(id), ...patch } }))
    setDirty((d) => ({ ...d, [id]: true }))
    if (justSaved === id) setJustSaved(null)
  }

  const save = (s: Student) => {
    const r = row(s.id)
    setPayment(s.id, mois, Number(r.montant) || 0, r.statut, r.statut === 'paye' ? todayISO() : '')
    refresh()
    setDirty((d) => ({ ...d, [s.id]: false }))
    setJustSaved(s.id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setJustSaved(null), 1600)
  }

  const totalDu = students.reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)
  const totalPaye = students.filter((s) => row(s.id).statut === 'paye').reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Paiements mensuels</h2>
        <div className="row">
          <div><label>Mois</label><input type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></div>
          <button className="small" onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Masquer' : 'Historique'}</button>
        </div>
      </div>

      {showHistory && historyMonths.length > 0 && (
        <div className="history-panel">
          <p className="muted" style={{ margin: '0 0 8px' }}>Mois enregistrés :</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {historyMonths.map((m) => (
              <button key={m} className={`small ${m === mois ? 'primary' : ''}`} onClick={() => { setMois(m); setShowHistory(false) }}>{m}</button>
            ))}
          </div>
        </div>
      )}

      <p className="muted">Encaissé : <strong>{totalPaye} DA</strong> / Attendu : <strong>{totalDu} DA</strong></p>
      <table>
        <thead><tr><th>Élève</th><th>Montant (DA)</th><th>Statut</th><th>Enregistrer</th></tr></thead>
        <tbody>
          {students.map((s) => {
            const saved = justSaved === s.id
            return (
            <tr key={s.id} className={saved ? 'row-saved' : ''}>
              <td><strong>{s.prenom} {s.nom}</strong></td>
              <td style={{ maxWidth: 140 }}>
                <input type="number" min={0} value={row(s.id).montant} onChange={(e) => edit(s.id, { montant: e.target.value })} />
              </td>
              <td>
                <select value={row(s.id).statut} onChange={(e) => edit(s.id, { statut: e.target.value as 'paye' | 'impaye' })}>
                  <option value="impaye">Impayé</option>
                  <option value="paye">Payé</option>
                </select>
              </td>
              <td>
                <button
                  className={saved ? 'small saved save-btn' : dirty[s.id] ? 'small primary save-btn' : 'small save-btn'}
                  onClick={() => save(s)}
                >
                  {saved
                    ? <><Check size={14} className="btn-ico" />Enregistré !</>
                    : <><Save size={14} className="btn-ico" />Enregistrer{dirty[s.id] ? ' *' : ''}</>}
                </button>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
      {students.length > 0 && (
        <div className="payments-footer">
          <span>Encaissé : <strong>{totalPaye} DA</strong></span>
          <span>Attendu : <strong>{totalDu} DA</strong></span>
        </div>
      )}
      {students.length === 0 && <p className="muted">Ajoutez d'abord des élèves dans l'onglet Élèves.</p>}
    </div>
  )
}
