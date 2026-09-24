import { CheckCheck, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addGrade, averageForStudent, deleteGrade, gradesForStudent, listGroups, listStudents, studentsByGroup, todayISO } from '../lib/db'
import type { GradeRow, Group, Student } from '../lib/types'

export default function Grades() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [evaluation, setEvaluation] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())

  // Saisie par groupe
  const [groupId, setGroupId] = useState<number | ''>('')
  const [groupStudents, setGroupStudents] = useState<Student[]>([])
  const [groupNotes, setGroupNotes] = useState<Record<number, string>>({})
  const [groupEval, setGroupEval] = useState('')
  const [groupDate, setGroupDate] = useState(todayISO())
  const [groupSaved, setGroupSaved] = useState(false)

  useEffect(() => { setStudents(listStudents('')); setGroups(listGroups()) }, [])

  const refresh = (id: number) => setGrades(gradesForStudent(id))
  const pick = (id: number | '') => {
    setStudentId(id)
    if (id !== '') refresh(Number(id))
    else setGrades([])
  }

  const pickGroup = (id: number | '') => {
    setGroupId(id)
    if (id !== '') {
      const list = studentsByGroup(Number(id))
      setGroupStudents(list)
      const n: Record<number, string> = {}
      for (const s of list) n[s.id] = ''
      setGroupNotes(n)
    } else {
      setGroupStudents([])
      setGroupNotes({})
    }
  }

  const avg = studentId !== '' ? averageForStudent(Number(studentId)) : null

  const save = () => {
    if (studentId === '') return
    if (!evaluation.trim() || note === '') { alert('Évaluation et note obligatoires.'); return }
    addGrade({ student_id: Number(studentId), evaluation, note: Number(note), date })
    setEvaluation(''); setNote(''); refresh(Number(studentId))
  }

  const saveGroup = () => {
    if (!groupEval.trim()) { alert("Nom de l'évaluation obligatoire."); return }
    const filled = groupStudents.filter((s) => groupNotes[s.id] !== '' && !Number.isNaN(Number(groupNotes[s.id])))
    if (filled.length === 0) { alert('Entrez au moins une note.'); return }
    if (!confirm(`Enregistrer ${filled.length} note(s) pour « ${groupEval} » ?`)) return
    for (const s of filled) {
      addGrade({ student_id: s.id, evaluation: groupEval, note: Number(groupNotes[s.id]), date: groupDate })
    }
    const n: Record<number, string> = {}
    for (const s of groupStudents) n[s.id] = ''
    setGroupNotes(n)
    setGroupEval('')
    setGroupSaved(true)
    setTimeout(() => setGroupSaved(false), 1800)
  }

  const filledCount = groupStudents.filter((s) => groupNotes[s.id] !== '').length

  return (
    <div>
      <div className="panel">
        <h2>Notes & moyennes</h2>
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
              <div style={{ alignSelf: 'end' }}><button className="primary" onClick={save}><Plus size={16} className="btn-ico" />Ajouter</button></div>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2><CheckCheck size={18} className="btn-ico" />Saisie par groupe</h2>
        <div className="row">
          <div style={{ minWidth: 220 }}>
            <label>Groupe</label>
            <select value={groupId} onChange={(e) => pickGroup(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Choisir —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          {groupId !== '' && (
            <>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label>Évaluation</label>
                <input value={groupEval} onChange={(e) => setGroupEval(e.target.value)} placeholder="Ex : Devoir 2" />
              </div>
              <div>
                <label>Date</label>
                <input type="date" value={groupDate} onChange={(e) => setGroupDate(e.target.value)} />
              </div>
            </>
          )}
        </div>
        {groupId !== '' && (
          <>
            <table style={{ marginTop: 12 }}>
              <thead><tr><th>Élève</th><th>Note / 20</th></tr></thead>
              <tbody>
                {groupStudents.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.prenom} {s.nom}</strong></td>
                    <td style={{ maxWidth: 140 }}>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.25}
                        value={groupNotes[s.id] ?? ''}
                        onChange={(e) => setGroupNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                        placeholder="—"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {groupStudents.length === 0 && <p className="muted">Aucun élève dans ce groupe.</p>}
            <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <span className="muted">{filledCount}/{groupStudents.length} note(s) saisie(s)</span>
              <button className={groupSaved ? 'primary saved' : 'primary'} onClick={saveGroup}>
                {groupSaved ? <><CheckCheck size={16} className="btn-ico" />Enregistré !</> : <>Enregistrer les notes</>}
              </button>
            </div>
          </>
        )}
        {groupId === '' && <p className="muted">Choisissez un groupe pour saisir plusieurs notes d'un coup.</p>}
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
                  <td><button className="small danger" onClick={() => { deleteGrade(g.id); refresh(Number(studentId)) }}><Trash2 size={14} className="btn-ico" />Supprimer</button></td>
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
