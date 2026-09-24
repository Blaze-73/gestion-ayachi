import { Check, Pencil, Plus, Printer, Search, Trash2, Undo2, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  addStudent, attendanceCountForStudent, averageForStudent, deleteStudent,
  fileToPhotoDataUrl, getStudent, listGroups, listStudents, monthISO,
  paymentsForMonth, todayISO, updateStudent,
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
  const [filterGroupeId, setFilterGroupeId] = useState<number | 'all' | 'none'>('all')
  const [stats, setStats] = useState<Record<number, { paye: boolean | null; presence: number | null; moyenne: number | null }>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [ficheId, setFicheId] = useState<number | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [copiedTel, setCopiedTel] = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Undo delete state
  const [deletedStudent, setDeletedStudent] = useState<Student | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Photo drag state
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); if (undoTimer.current) clearTimeout(undoTimer.current); if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  const refresh = () => {
    const list = listStudents(q)
    setStudents(list)
    setGroups(listGroups())
    const mois = monthISO()
    const payes = new Map(paymentsForMonth(mois).map((p) => [p.student_id, p.statut === 'paye']))
    const st: Record<number, { paye: boolean | null; presence: number | null; moyenne: number | null }> = {}
    for (const s of list) {
      const { total, presents } = attendanceCountForStudent(s.id)
      st[s.id] = {
        paye: payes.has(s.id) ? payes.get(s.id)! : null,
        presence: total > 0 ? Math.round((presents / total) * 100) : null,
        moyenne: averageForStudent(s.id),
      }
    }
    setStats(st)
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(refresh, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close fiche with Escape
  useEffect(() => {
    if (ficheId === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFicheId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ficheId])

  const saveRef = useRef<() => void>(() => {})

  // Close form overlay with Escape + Ctrl+N to open new + Ctrl+S to save + Ctrl+K to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && formOpen) {
        setFormOpen(false)
        setEditing(null)
        setForm(EMPTY)
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        setEditing(null)
        setForm(EMPTY)
        setFormOpen(true)
      }
      if (e.ctrlKey && e.key === 's' && formOpen) {
        e.preventDefault()
        saveRef.current()
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setFormOpen(false)
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formOpen])

  const groupName = (id: number | null) => groups.find((g) => g.id === id)?.nom ?? '—'

  const copyTel = (tel: string) => {
    void navigator.clipboard.writeText(tel)
    setCopiedTel(tel)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopiedTel(''), 1500)
  }

  const filtered = students.filter((s) => {
    if (filterGroupeId === 'all') return true
    if (filterGroupeId === 'none') return s.groupe_id === null
    return s.groupe_id === filterGroupeId
  })
  const groupCount = (id: number | 'none') =>
    students.filter((s) => (id === 'none' ? s.groupe_id === null : s.groupe_id === id)).length
  const noGroupCount = groupCount('none')

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
  useEffect(() => { saveRef.current = save })

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
    if (!confirm(`Supprimer ${s.prenom} ${s.nom} ?`)) return
    deleteStudent(s.id)
    refresh()
    setDeletedStudent(s)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeletedStudent(null), 5000)
  }

  const undoDelete = () => {
    if (!deletedStudent) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    addStudent({ nom: deletedStudent.nom, prenom: deletedStudent.prenom, naissance: deletedStudent.naissance, tel: deletedStudent.tel, parent_tel: deletedStudent.parent_tel, adresse: deletedStudent.adresse, photo: deletedStudent.photo, groupe_id: deletedStudent.groupe_id, inscription_date: deletedStudent.inscription_date, remarques: deletedStudent.remarques })
    refresh()
    setDeletedStudent(null)
  }

  const set = (k: keyof typeof EMPTY, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Photo drag-and-drop handlers
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      if (!formOpen) {
        setEditing(null)
        setForm({ ...EMPTY, inscription_date: todayISO() })
        setFormOpen(true)
      }
      void onPhoto(file)
    }
  }

  return (
    <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
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

      {/* Undo delete toast */}
      {deletedStudent && (
        <div className="undo-toast">
          <span>{deletedStudent.prenom} {deletedStudent.nom} supprimé</span>
          <button className="small" onClick={undoDelete}><Undo2 size={14} className="btn-ico" />Annuler</button>
        </div>
      )}

      {/* Photo drag overlay */}
      {dragging && (
        <div className="drag-overlay">
          <div className="drag-box">
            <UserPlus size={40} color="var(--primary)" />
            <p>Déposez la photo ici</p>
          </div>
        </div>
      )}

      {/* Search + add bar */}
      <div className="panel">
        <div className="group-pills">
          <button className={filterGroupeId === 'all' ? 'pill active' : 'pill'} onClick={() => setFilterGroupeId('all')}>
            Tous ({students.length})
          </button>
          {groups.map((g) => (
            <button key={g.id} className={filterGroupeId === g.id ? 'pill active' : 'pill'} onClick={() => setFilterGroupeId(g.id)}>
              {g.nom} ({groupCount(g.id)})
            </button>
          ))}
          <button className={filterGroupeId === 'none' ? 'pill active' : 'pill'} onClick={() => setFilterGroupeId('none')}>
            Sans groupe ({noGroupCount})
          </button>
        </div>
        <div className="students-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Rechercher (Ctrl+K)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="primary" onClick={openNew}><Plus size={17} className="btn-ico" />Nouvel élève <span className="shortcut-hint">Ctrl+N</span></button>
        </div>

        {justSaved && <div className="save-toast"><Check size={16} className="btn-ico" />Élève enregistré avec succès</div>}

        {filtered.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            {q || filterGroupeId !== 'all' ? 'Aucun résultat pour ce filtre.' : 'Aucun élève. Ajoutez le premier avec le bouton ci-dessus.'}
          </p>
        ) : (
          <div className="students-list">
            {filtered.map((s) => (
              <div key={s.id} className="student-row">
                <div className="student-row-main">
                  {s.photo ? <img src={s.photo} className="avatar" alt="" /> : <div className="avatar avatar-placeholder" />}
                  <div className="student-row-info">
                    <strong>{s.prenom} {s.nom}</strong>
                    <span className="muted">
                      {groupName(s.groupe_id)}
                      {(() => {
                        const tel = s.parent_tel || s.tel
                        if (!tel) return null
                        return (
                          <>
                            {s.groupe_id ? ' · ' : ''}
                            <button className="tel-btn" title="Cliquer pour copier" onClick={() => copyTel(tel)}>
                              {copiedTel === tel ? 'Copié !' : tel}
                            </button>
                          </>
                        )
                      })()}
                    </span>
                    <span className="student-badges">
                      {stats[s.id]?.paye === true && <span className="badge paye">Payé</span>}
                      {stats[s.id]?.paye === false && <span className="badge impaye">Impayé</span>}
                      {stats[s.id]?.presence !== null && stats[s.id]?.presence !== undefined && (
                        <span className="badge neutral">{stats[s.id].presence}% présence</span>
                      )}
                      {stats[s.id]?.moyenne !== null && stats[s.id]?.moyenne !== undefined && (
                        <span className="badge neutral">{stats[s.id].moyenne!.toFixed(1)}/20</span>
                      )}
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
