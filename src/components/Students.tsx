import { Pencil, Plus, Printer, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addStudent, deleteStudent, fileToPhotoDataUrl, getStudent,
  listGroups, listStudents, todayISO, updateStudent,
} from '../lib/db'
import type { Group, Student } from '../lib/types'
import FicheEleve from './FicheEleve'

const EMPTY: Omit<Student, 'id'> = {
  nom: '', prenom: '', naissance: '', tel: '', parent_tel: '',
  adresse: '', photo: '', groupe_id: null, inscription_date: todayISO(), remarques: '',
}

export default function Students() {
  const [q, setQ] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [ficheId, setFicheId] = useState<number | null>(null)

  const refresh = () => {
    setStudents(listStudents(q))
    setGroups(listGroups())
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setStudents(listStudents(q)) }, [q])

  // Fermer la fiche avec Echap
  useEffect(() => {
    if (ficheId === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFicheId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ficheId])

  const groupName = (id: number | null) => groups.find((g) => g.id === id)?.nom ?? '—'

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    setForm({ ...form, photo: await fileToPhotoDataUrl(f) })
  }

  const save = () => {
    if (!form.nom.trim()) { alert('Le nom est obligatoire.'); return }
    if (editing) updateStudent({ ...form, id: editing.id })
    else addStudent(form)
    setEditing(null); setForm(EMPTY); refresh()
  }

  const edit = (s: Student) => {
    setEditing(s)
    const full = getStudent(s.id)
    if (full) {
      const { id: _omit, ...rest } = full
      setForm(rest)
    }
    window.scrollTo({ top: 0 })
  }

  const remove = (s: Student) => {
    if (confirm(`Supprimer ${s.prenom} ${s.nom} ?`)) { deleteStudent(s.id); refresh() }
  }

  const set = (k: keyof typeof EMPTY, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      {ficheId !== null && (
        <div className="overlay" onClick={() => setFicheId(null)}>
          <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
            <div className="row no-print" style={{ marginBottom: 12 }}>
              <button className="primary" onClick={() => window.print()}><Printer size={16} className="btn-ico" />Imprimer / PDF</button>
              <button onClick={() => setFicheId(null)}><X size={16} className="btn-ico" />Fermer</button>
            </div>
            <FicheEleve studentId={ficheId} />
          </div>
        </div>
      )}

      <div className="panel">
        <h2>{editing ? `Modifier : ${editing.prenom} ${editing.nom}` : <><Plus size={18} className="btn-ico" />Nouvel élève</>}</h2>
        <div className="grid2">
          <div><label>Nom *</label><input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex : Benali" /></div>
          <div><label>Prénom</label><input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} placeholder="Ex : Yasmine" /></div>
          <div><label>Date de naissance</label><input type="date" value={form.naissance} onChange={(e) => set('naissance', e.target.value)} /></div>
          <div><label>Date d'inscription</label><input type="date" value={form.inscription_date} onChange={(e) => set('inscription_date', e.target.value)} /></div>
          <div><label>Téléphone élève</label><input value={form.tel} onChange={(e) => set('tel', e.target.value)} /></div>
          <div><label>Téléphone parent</label><input value={form.parent_tel} onChange={(e) => set('parent_tel', e.target.value)} /></div>
          <div><label>Adresse</label><input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></div>
          <div>
            <label>Groupe</label>
            <select value={form.groupe_id ?? ''} onChange={(e) => set('groupe_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sans groupe —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.nom} ({g.jour} {g.heure})</option>)}
            </select>
          </div>
          <div>
            <label>Photo (fichier ou webcam via capture)</label>
            <input type="file" accept="image/*" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </div>
          <div>
            <label>Remarques</label>
            <input value={form.remarques} onChange={(e) => set('remarques', e.target.value)} />
          </div>
        </div>
        {form.photo && <div style={{ marginTop: 8 }}><img src={form.photo} className="avatar big" alt="" /></div>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={save}>{editing ? 'Enregistrer' : <><UserPlus size={16} className="btn-ico" />Ajouter l'élève</>}</button>
          {editing && <button onClick={() => { setEditing(null); setForm(EMPTY) }}>Annuler</button>}
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Élèves ({students.length})</h2>
          <input className="search" placeholder="Rechercher nom, prénom, tél…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Photo</th><th>Nom</th><th>Groupe</th><th>Tél parent</th><th>Actions</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.photo ? <img src={s.photo} className="avatar" alt="" /> : <span className="muted">—</span>}</td>
                <td><strong>{s.prenom} {s.nom}</strong></td>
                <td>{groupName(s.groupe_id)}</td>
                <td>{s.parent_tel || s.tel || '—'}</td>
                <td>
                  <div className="row">
                    <button className="small" onClick={() => setFicheId(s.id)}><Printer size={14} className="btn-ico" />Fiche</button>
                    <button className="small" onClick={() => edit(s)}><Pencil size={14} className="btn-ico" />Modifier</button>
                    <button className="small danger" onClick={() => remove(s)}><Trash2 size={14} className="btn-ico" />Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="muted">Aucun élève. Ajoutez le premier ci-dessus.</p>}
      </div>
    </div>
  )
}
