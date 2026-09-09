import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listStudents, monthISO, paymentsForMonth, setPayment, todayISO } from '../lib/db'
import type { Student } from '../lib/types'

export default function Payments() {
  const [mois, setMois] = useState(monthISO())
  const [students, setStudents] = useState<Student[]>([])
  const [rows, setRows] = useState<Record<number, { montant: number; statut: 'paye' | 'impaye' }>>({})

  const refresh = () => {
    setStudents(listStudents(''))
    const existing = paymentsForMonth(mois)
    const m: Record<number, { montant: number; statut: 'paye' | 'impaye' }> = {}
    for (const p of existing) m[p.student_id] = { montant: p.montant, statut: p.statut }
    setRows(m)
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(refresh, [mois]) // eslint-disable-line react-hooks/exhaustive-deps

  const row = (id: number) => rows[id] ?? { montant: 0, statut: 'impaye' as const }
  const edit = (id: number, patch: Partial<{ montant: number; statut: 'paye' | 'impaye' }>) =>
    setRows((r) => ({ ...r, [id]: { ...row(id), ...patch } }))

  const save = (s: Student) => {
    const r = row(s.id)
    setPayment(s.id, mois, Number(r.montant) || 0, r.statut, r.statut === 'paye' ? todayISO() : '')
    refresh()
  }

  const totalDu = students.reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)
  const totalPaye = students.filter((s) => row(s.id).statut === 'paye').reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Paiements mensuels</h2>
        <div><label>Mois</label><input type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></div>
      </div>
      <p className="muted">Encaissé : <strong>{totalPaye} DA</strong> / Attendu : <strong>{totalDu} DA</strong></p>
      <table>
        <thead><tr><th>Élève</th><th>Montant (DA)</th><th>Statut</th><th>Enregistrer</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.prenom} {s.nom}</strong></td>
              <td style={{ maxWidth: 140 }}>
                <input type="number" min={0} value={row(s.id).montant} onChange={(e) => edit(s.id, { montant: Number(e.target.value) })} />
              </td>
              <td>
                <select value={row(s.id).statut} onChange={(e) => edit(s.id, { statut: e.target.value as 'paye' | 'impaye' })}>
                  <option value="impaye">Impayé</option>
                  <option value="paye">Payé</option>
                </select>
              </td>
              <td><button className="small primary" onClick={() => save(s)}><Save size={14} className="btn-ico" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && <p className="muted">Ajoutez d'abord des élèves dans l'onglet Élèves.</p>}
    </div>
  )
}
