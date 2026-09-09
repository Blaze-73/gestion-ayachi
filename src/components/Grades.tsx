import { useEffect, useState } from 'react'
import { addGrade, averageForStudent, deleteGrade, gradesForStudent, listStudents, todayISO } from '../lib/db'
import type { GradeRow, Student } from '../lib/types'

export default function Grades() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [evaluation, setEvaluation] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())

  useEffect(() => { setStudents(listStudents('')) }, [])

  const refresh = (id: number) => setGrades(gradesForStudent(id))
  const pick = (id: number | '') => {
    setStudentId(id)
    if (id !== '') refresh(Number(id))
    else setGrades([])
  }

  const avg = studentId !== '' ? averageForStudent(Number(studentId)) : null

  const save = () => {
    if (studentId === '') return
    if (!evaluation.trim() || note === '') { alert('Évaluation et note obligatoires.'); return }
    addGrade({ student_id: Number(studentId), evaluation, note: Number(note), date })
    setEvaluation(''); setNote(''); refresh(Number(studentId))
  }

  return (
    <div>
      <div className="panel">
        <h2>📝 Notes & moyennes</h2>
        <div style={{ maxWidth: 320 }}>
          <label>Élève</label>
          <select value={studentId} onChange={(e) => pick(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— Choisir —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
          </select>
        </div>
        {studentId !== '' && (
          <>
            <p>Moyenne : <strong>{avg !== null ? avg.toFixed(2) : '—'}</strong></p>
            <div className="row">
              <div style={{ flex: 2, minWidth: 180 }}><label>Évaluation</label><input value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="Ex : Devoir 1" /></div>
              <div style={{ flex: 1, minWidth: 100 }}><label>Note / 20</label><input type="number" min={0} max={20} step={0.25} value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div style={{ alignSelf: 'end' }}><button className="primary" onClick={save}>Ajouter</button></div>
            </div>
          </>
        )}
      </div>
      {studentId !== '' && (
        <div className="panel">
          <h2>Historique</h2>
          <table>
            <thead><tr><th>Date</th><th>Évaluation</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  <td>{g.date || '—'}</td><td>{g.evaluation || '—'}</td><td><strong>{g.note}</strong></td>
                  <td><button className="small danger" onClick={() => { deleteGrade(g.id); refresh(Number(studentId)) }}>Supprimer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {grades.length === 0 && <p className="muted">Aucune note pour cet élève.</p>}
        </div>
      )}
    </div>
  )
}
