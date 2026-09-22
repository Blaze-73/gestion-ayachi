import { Check, CheckCheck, Printer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { attendanceForDate, listGroups, markAttendance, studentsByGroup, todayISO } from '../lib/db'
import type { Group, Student } from '../lib/types'

export default function Attendance({ initialGroupId }: { initialGroupId?: number | null } = {}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [groupeId, setGroupeId] = useState<number | ''>(initialGroupId ?? '')
  const [date, setDate] = useState(todayISO())
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Record<number, 'present' | 'absent'>>({})

  useEffect(() => { setGroups(listGroups()) }, [])

  useEffect(() => {
    if (groupeId === '') { setStudents([]); return }
    setStudents(studentsByGroup(Number(groupeId)))
    const rows = attendanceForDate(date)
    const m: Record<number, 'present' | 'absent'> = {}
    for (const r of rows) m[r.student_id] = r.statut
    setMarks(m)
  }, [groupeId, date])

  const mark = (id: number, s: 'present' | 'absent') => {
    markAttendance(id, date, s)
    setMarks((m) => ({ ...m, [id]: s }))
  }

  // Quick-toggle: tap student name → cycle: absent → present → clear
  const quickToggle = (id: number) => {
    const current = marks[id]
    if (!current) mark(id, 'absent')
    else if (current === 'absent') mark(id, 'present')
    else {
      // clear: remove from attendance
      markAttendance(id, date, 'present')
      setMarks((m) => { const n = { ...m }; delete n[id]; return n })
    }
  }

  const markAll = (s: 'present' | 'absent') => students.forEach((st) => mark(st.id, s))

  const presents = students.filter((s) => marks[s.id] === 'present').length
  const absents = students.filter((s) => marks[s.id] === 'absent').length

  const printSheet = () => {
    const group = groups.find((g) => g.id === groupeId)
    if (!group) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Appel — ${group.nom}</title>
<style>
body{font-family:"Segoe UI",sans-serif;padding:30px;color:#111}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;color:#555;margin:0 0 20px;font-weight:normal}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:13px}
th{background:#f3f4f6;font-weight:600}
.col-check{width:60px;text-align:center}
@media print{body{padding:15px}}
</style></head><body>
<h1>Appel du ${date}</h1>
<h2>${group.nom} — ${group.jour} ${group.heure} — ${group.matiere}</h2>
<table><thead><tr><th>Élève</th><th class="col-check">Présent</th><th class="col-check">Absent</th><th>Observations</th></tr></thead>
<tbody>${students.map((s) => `<tr><td>${s.prenom} ${s.nom}</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td><td></td></tr>`).join('')}</tbody></table>
<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px;color:#555">
<span>Total : ${students.length} élèves</span>
<span>Signature du professeur : ________________</span>
</div>
</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="panel">
      <h2>Présences</h2>
      <div className="row">
        <div style={{ minWidth: 220 }}>
          <label>Groupe</label>
          <select value={groupeId} onChange={(e) => setGroupeId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— Choisir —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
        </div>
        <div>
          <label>Date du cours</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {students.length > 0 && (
          <>
            <button className="small" onClick={() => markAll('present')}><CheckCheck size={14} className="btn-ico" />Tous présents</button>
            <button className="small" onClick={() => markAll('absent')}><X size={14} className="btn-ico" />Tous absents</button>
            <button className="small" onClick={printSheet}><Printer size={14} className="btn-ico" />Fiche vide</button>
          </>
        )}
      </div>
      {groupeId !== '' && (
        <p className="muted">Présents : <strong>{presents}</strong> — Absents : <strong>{absents}</strong> — Non marqués : <strong>{students.length - presents - absents}</strong></p>
      )}
      <table>
        <thead><tr><th>Élève</th><th>Statut</th><th>Tap name to toggle</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <button className="student-name-btn" onClick={() => quickToggle(s.id)}>
                  <strong>{s.prenom} {s.nom}</strong>
                </button>
              </td>
              <td>
                {marks[s.id] ? <span className={`badge ${marks[s.id]}`}>{marks[s.id] === 'present' ? 'Présent' : 'Absent'}</span>
                  : <span className="muted">—</span>}
              </td>
              <td>
                <div className="row">
                  <button className="small" onClick={() => mark(s.id, 'present')}><Check size={14} className="btn-ico" />Présent</button>
                  <button className="small" onClick={() => mark(s.id, 'absent')}><X size={14} className="btn-ico" />Absent</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {groupeId === '' && <p className="muted">Choisissez un groupe pour faire l'appel.</p>}
    </div>
  )
}
