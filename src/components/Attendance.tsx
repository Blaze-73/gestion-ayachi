import { useEffect, useState } from 'react'
import { attendanceForDate, listGroups, markAttendance, studentsByGroup, todayISO } from '../lib/db'
import type { Group, Student } from '../lib/types'

export default function Attendance() {
  const [groups, setGroups] = useState<Group[]>([])
  const [groupeId, setGroupeId] = useState<number | ''>('')
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
  const markAll = (s: 'present' | 'absent') => students.forEach((st) => mark(st.id, s))

  const presents = students.filter((s) => marks[s.id] === 'present').length
  const absents = students.filter((s) => marks[s.id] === 'absent').length

  return (
    <div className="panel">
      <h2>✅❌ Présences</h2>
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
            <button className="small" onClick={() => markAll('present')}>Tous présents</button>
            <button className="small" onClick={() => markAll('absent')}>Tous absents</button>
          </>
        )}
      </div>
      {groupeId !== '' && (
        <p className="muted">Présents : <strong>{presents}</strong> — Absents : <strong>{absents}</strong> — Non marqués : <strong>{students.length - presents - absents}</strong></p>
      )}
      <table>
        <thead><tr><th>Élève</th><th>Statut</th><th>Marquer</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.prenom} {s.nom}</strong></td>
              <td>
                {marks[s.id] ? <span className={`badge ${marks[s.id]}`}>{marks[s.id] === 'present' ? 'Présent' : 'Absent'}</span>
                  : <span className="muted">—</span>}
              </td>
              <td>
                <div className="row">
                  <button className="small" onClick={() => mark(s.id, 'present')}>✅ Présent</button>
                  <button className="small" onClick={() => mark(s.id, 'absent')}>❌ Absent</button>
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
