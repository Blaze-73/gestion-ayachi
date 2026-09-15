import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addGroup, deleteGroup, listGroups, studentsByGroup, updateGroup } from '../lib/db'
import type { Group } from '../lib/types'

const JOURS = ['Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const JOUR_ORDER = Object.fromEntries(JOURS.map((j, i) => [j, i]))

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [nom, setNom] = useState('')
  const [matiere, setMatiere] = useState('Français')
  const [jour, setJour] = useState('Samedi')
  const [heure, setHeure] = useState('')
  const [capacite, setCapacite] = useState(0)
  const [editing, setEditing] = useState<Group | null>(null)
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>({})

  const refresh = () => {
    const g = listGroups()
    setGroups(g)
    const counts: Record<number, number> = {}
    for (const group of g) counts[group.id] = studentsByGroup(group.id).length
    setMemberCounts(counts)
  }
  useEffect(refresh, [])

  const save = () => {
    if (!nom.trim()) { alert('Nom du groupe obligatoire.'); return }
    if (editing) updateGroup({ ...editing, nom, matiere, jour, heure, capacite })
    else addGroup({ nom, matiere, jour, heure, capacite })
    setNom(''); setMatiere('Français'); setHeure(''); setCapacite(0); setEditing(null); refresh()
  }

  const resetForm = () => {
    setEditing(null); setNom(''); setMatiere('Français'); setHeure(''); setCapacite(0)
  }

  return (
    <div>
      <div className="panel">
        <h2>{editing ? `Modifier : ${editing.nom}` : <><Plus size={18} className="btn-ico" />Nouveau groupe</>}</h2>
        <div className="grid2">
          <div><label>Nom du groupe *</label><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Groupe Samedi 10h" /></div>
          <div><label>Matière</label><input value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Français" /></div>
          <div>
            <label>Jour</label>
            <select value={jour} onChange={(e) => setJour(e.target.value)}>
              {JOURS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
          <div><label>Heure</label><input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></div>
          <div><label>Capacité max (0 = illimité)</label><input type="number" min={0} value={capacite} onChange={(e) => setCapacite(Number(e.target.value))} placeholder="0" /></div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={save}>{editing ? 'Enregistrer' : 'Ajouter le groupe'}</button>
          {editing && <button onClick={resetForm}>Annuler</button>}
        </div>
      </div>
      <div className="panel">
        <h2>Groupes & emploi du temps ({groups.length})</h2>
        <table>
          <thead><tr><th>Groupe</th><th>Matière</th><th>Jour</th><th>Heure</th><th>Élèves</th><th>Actions</th></tr></thead>
          <tbody>
            {[...groups].sort((a, b) => (JOUR_ORDER[a.jour] ?? 99) - (JOUR_ORDER[b.jour] ?? 99)).map((g) => {
              const count = memberCounts[g.id] ?? 0
              const full = g.capacite > 0 && count >= g.capacite
              return (
              <tr key={g.id}>
                <td><strong>{g.nom}</strong></td><td>{g.matiere || '—'}</td>
                <td>{g.jour || '—'}</td><td>{g.heure || '—'}</td>
                <td><span className={full ? 'badge impaye' : ''}>{count}{g.capacite > 0 ? ` / ${g.capacite}` : ''}</span></td>
                <td>
                  <div className="row">
                    <button className="small" onClick={() => { setEditing(g); setNom(g.nom); setMatiere(g.matiere); setJour(g.jour || 'Samedi'); setHeure(g.heure); setCapacite(g.capacite || 0) }}><Pencil size={14} className="btn-ico" />Modifier</button>
                    <button className="small danger" onClick={() => { if (confirm(`Supprimer ${g.nom} ?`)) { deleteGroup(g.id); refresh() } }}><Trash2 size={14} className="btn-ico" />Supprimer</button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {groups.length === 0 && <p className="muted">Aucun groupe. Créez le premier ci-dessus.</p>}
      </div>
    </div>
  )
}
