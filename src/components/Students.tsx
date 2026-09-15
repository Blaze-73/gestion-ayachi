import { Check, Pencil, Plus, Printer, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  addStudent, deleteStudent, fileToPhotoDataUrl, getStudent,
  listGroups, listStudents, todayISO, updateStudent,
} from '../lib/db'
import type { Group, Student } from '../lib/types'
import DateSelect from './DateSelect'
import FicheEleve from './FicheEleve'

const EMPTY: Omit<Student, 'id'> = {
  nom: '', prenom: '', naissance: '', tel: '', parent_tel: '',
  adresse: '', photo: '', groupe_id: null, inscription_date: todayISO(), remarques: '',
}

export default function Students() {
  const [q, setQ] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [ficheId, setFicheId] = useState<number | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  const refresh = () => {
    setStudents(listStudents(q))
    setGroups(listGroups())
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setStudents(listStudents(q)) }, [q])

  // Close fiche with Escape
  useEffect(() => {
    if (ficheId === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFicheId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ficheId])

  // Close form overlay with Escape
  useEffect(() => {
    if (!formOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormOpen(false)
        setEditing(null)
        setForm(EMPTY)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formOpen])

  const groupName = (id: number | null) => groups.find((g) => g.id === id)?.nom ?? '—'

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    setForm({ ...form, photo: await fileToPhotoDataUrl(f) })
  }

  const save = () => {
    if (!form.nom.trim()) { alert('Le nom est obligatoire.'); return }
    if (editing) updateStudent({ ...form, id: editing.id })
    else addStudent(form)
    closeForm()
    refresh()
    setJustSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setJustSaved(false), 1800)
  }

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormOpen(true)
  }

  const openEdit = (s: Student) => {
    setEditing(s)
    const full = getStudent(s.id)
    if (full) {
      const { id: _omit, ...rest } = full
      setForm(rest)
    }
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY)
  }

  const remove = (s: Student) => {
    if (confirm(`Supprimer ${s.prenom} ${s.nom} ?`)) { deleteStudent(s.id); refresh() }
  }

  const set = (k: keyof typeof EMPTY, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      {/* Fiche overlay */}
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

      {/* Add/edit overlay */}
      {formOpen && (
        <div className="overlay" onClick={closeForm}>
          <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>{editing ? `Modifier : ${editing.prenom} ${editing.nom}` : <><UserPlus size={18} className="btn-ico" />Nouvel élève</>}</h2>
              <button onClick={closeForm}><X size={16} className="btn-ico" />Fermer</button>
            </div>
            <div className="grid2">
              <div><label>Nom *</label><input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex : Benali" autoFocus /></div>
              <div><label>Prénom</label><input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} placeholder="Ex : Yasmine" /></div>
              <DateSelect
                label="Date de naissance"
                value={form.naissance}
                onChange={(v) => set('naissance', v)}
                yearFrom={new Date().getFullYear() - 40}
                yearTo={new Date().getFullYear() - 4}
                clearable
                showAge
              />
              <DateSelect
                label="Date d'inscription"
                value={form.inscription_date}
                onChange={(v) => set('inscription_date', v)}
                yearFrom={new Date().getFullYear() - 5}
                yearTo={new Date().getFullYear() + 1}
                todayButton
              />
              <div><label>Téléphone élève</label><input value={form.tel} onChange={(e) => set('tel', e.target.value)} placeholder="06XX XX XX XX" /></div>
              <div><label>Téléphone parent</label><input value={form.parent_tel} onChange={(e) => set('parent_tel', e.target.value)} placeholder="06XX XX XX XX" /></div>
              <div><label>Adresse</label><input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} placeholder="Facultatif" /></div>
              <div>
                <label>Groupe</label>
                <select value={form.groupe_id ?? ''} onChange={(e) => set('groupe_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Sans groupe —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.nom} ({g.jour} {g.heure})</option>)}
                </select>
              </div>
              <div>
                <label>Photo</label>
                <input type="file" accept="image/*" onChange={(e) => void onPhoto(e.target.files?.[0])} />
              </div>
              <div>
                <label>Remarques</label>
                <input value={form.remarques} onChange={(e) => set('remarques', e.target.value)} placeholder="Facultatif" />
              </div>
            </div>
            {form.photo && <div style={{ marginTop: 8 }}><img src={form.photo} className="avatar big" alt="" /></div>}
            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={closeForm}>Annuler</button>
              <button className="primary" onClick={save}>{editing ? 'Enregistrer' : <><UserPlus size={16} className="btn-ico" />Ajouter</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + add bar */}
      <div className="panel">
        <div className="students-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Rechercher par nom, prénom ou téléphone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="primary" onClick={openNew}><Plus size={17} className="btn-ico" />Nouvel élève</button>
        </div>

        {justSaved && <div className="save-toast"><Check size={16} className="btn-ico" />Élève enregistré avec succès</div>}

        {students.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            {q ? 'Aucun résultat pour cette recherche.' : 'Aucun élève. Ajoutez le premier avec le bouton ci-dessus.'}
          </p>
        ) : (
          <div className="students-list">
            {students.map((s) => (
              <div key={s.id} className="student-row">
                <div className="student-row-main">
                  {s.photo ? <img src={s.photo} className="avatar" alt="" /> : <div className="avatar avatar-placeholder" />}
                  <div className="student-row-info">
                    <strong>{s.prenom} {s.nom}</strong>
                    <span className="muted">
                      {groupName(s.groupe_id)}{s.groupe_id ? ' · ' : ''}{s.parent_tel || s.tel || ''}
                    </span>
                  </div>
                </div>
                <div className="student-row-actions">
                  <button className="small" onClick={() => setFicheId(s.id)}><Printer size={14} className="btn-ico" />Fiche</button>
                  <button className="small" onClick={() => openEdit(s)}><Pencil size={14} className="btn-ico" />Modifier</button>
                  <button className="small danger" onClick={() => remove(s)}><Trash2 size={14} className="btn-ico" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
