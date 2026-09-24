import { Check, Printer, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { distinctPaymentMonths, listStudents, monthISO, paymentsForMonth, setPayment, todayISO } from '../lib/db'
import { toast } from '../lib/toast'
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
  const [onlyUnpaid, setOnlyUnpaid] = useState(false)
  const [defaultAmount, setDefaultAmount] = useState('')

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

  const fillEmptyAmounts = () => {
    const amount = Number(defaultAmount)
    if (!amount || amount <= 0) { toast('Entrez un montant valide.', 'error'); return }
    const targets = students.filter((s) => !(Number(row(s.id).montant) > 0))
    if (targets.length === 0) { toast('Tous les montants sont déjà remplis.', 'info'); return }
    for (const s of targets) setPayment(s.id, mois, amount, row(s.id).statut, row(s.id).statut === 'paye' ? todayISO() : '')
    setDefaultAmount('')
    refresh()
  }

  const printSheet = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const lines = visible.map((s) => {
      const r = row(s.id)
      const etat = r.statut === 'paye' ? 'Payé' : 'Impayé'
      return `<tr><td>${s.prenom} ${s.nom}</td><td>${r.montant || '—'}</td><td>${etat}</td><td>${r.statut === 'paye' ? (paymentsForMonth(mois).find((p) => p.student_id === s.id)?.date_paiement || '—') : ''}</td></tr>`
    }).join('')
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Paiements — ${mois}</title>
<style>
body{font-family:"Segoe UI",sans-serif;padding:30px;color:#111}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;color:#555;margin:0 0 20px;font-weight:normal}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:13px}
th{background:#f3f4f6;font-weight:600}
.totals{margin-top:16px;display:flex;gap:30px;font-size:14px;font-weight:600}
@media print{body{padding:15px}}
</style></head><body>
<h1>Fiche de paiements — ${mois}</h1>
<h2>Gestion Ayachi — ${visible.length} élève(s)</h2>
<table><thead><tr><th>Élève</th><th>Montant (DA)</th><th>Statut</th><th>Date</th></tr></thead>
<tbody>${lines}</tbody></table>
<div class="totals"><span>Encaissé : ${totalPaye} DA</span><span>Attendu : ${totalDu} DA</span></div>
<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px;color:#555">
<span>Signature : ________________</span>
</div>
</body></html>`)
    win.document.close()
    win.print()
  }

  const visible = onlyUnpaid ? students.filter((s) => row(s.id).statut !== 'paye') : students

  const totalDu = visible.reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)
  const totalPaye = visible.filter((s) => row(s.id).statut === 'paye').reduce((t, s) => t + (Number(row(s.id).montant) || 0), 0)

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Paiements mensuels</h2>
        <div className="row">
          <div><label>Mois</label><input type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></div>
          <button className={onlyUnpaid ? 'small primary' : 'small'} onClick={() => setOnlyUnpaid(!onlyUnpaid)}>Impayés uniquement</button>
          <button className="small" onClick={printSheet}><Printer size={14} className="btn-ico" />Imprimer la fiche</button>
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
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          type="number"
          min={0}
          placeholder="Montant par défaut (DA)"
          value={defaultAmount}
          onChange={(e) => setDefaultAmount(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <button className="small" onClick={fillEmptyAmounts}>Remplir les montants vides</button>
      </div>
      <table>
        <thead><tr><th>Élève</th><th>Montant (DA)</th><th>Statut</th><th>Enregistrer</th></tr></thead>
        <tbody>
          {visible.map((s) => {
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
      {visible.length > 0 && (
        <div className="payments-footer">
          <span>Encaissé : <strong>{totalPaye} DA</strong></span>
          <span>Attendu : <strong>{totalDu} DA</strong></span>
        </div>
      )}
      {visible.length === 0 && onlyUnpaid && students.length > 0 && (
        <p className="muted">Tout est payé pour ce mois. <button className="small" onClick={() => setOnlyUnpaid(false)}>Voir tous</button></p>
      )}
      {students.length === 0 && <p className="muted">Ajoutez d'abord des élèves dans l'onglet Élèves.</p>}
    </div>
  )
}
