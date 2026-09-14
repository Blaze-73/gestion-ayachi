import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addGroup, deleteGroup, listGroups, updateGroup } from '../lib/db'
import type { Group } from '../lib/types'

const JOURS = ['Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [nom, setNom] = useState('')
  const [matiere, setMatiere] = useState('Français')
  const [jour, setJour] = useState('Samedi')
  const [heure, setHeure] = useState('')
  const [editing, setEditing] = useState<Group | null>(null)

  const refresh = () => setGroups(listGroups())
  useEffect(refresh, [])

  const save = () => {
    if (!nom.trim()) { alert('Nom du groupe obligatoire.'); return }
    if (editing) updateGroup({ ...editing, nom, matiere, jour, heure })
    else addGroup({ nom, matiere, jour, heure })
    setNom(''); setMatiere('Français'); setHeure(''); setEditing(null); refresh()
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
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={save}>{editing ? 'Enregistrer' : 'Ajouter le groupe'}</button>
          {editing && <button onClick={() => { setEditing(null); setNom(''); setMatiere('Français'); setHeure('') }}>Annuler</button>}
        </div>
      </div>
      <div className="panel">
        <h2>Groupes & emploi du temps ({groups.length})</h2>
        <table>
          <thead><tr><th>Groupe</th><th>Matière</th><th>Jour</th><th>Heure</th><th>Actions</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td><strong>{g.nom}</strong></td><td>{g.matiere || '—'}</td>
                <td>{g.jour || '—'}</td><td>{g.heure || '—'}</td>
                <td>
                  <div className="row">
                    <button className="small" onClick={() => { setEditing(g); setNom(g.nom); setMatiere(g.matiere); setJour(g.jour || 'Samedi'); setHeure(g.heure) }}><Pencil size={14} className="btn-ico" />Modifier</button>
                    <button className="small danger" onClick={() => { if (confirm(`Supprimer ${g.nom} ?`)) { deleteGroup(g.id); refresh() } }}><Trash2 size={14} className="btn-ico" />Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {groups.length === 0 && <p className="muted">Aucun groupe. Créez le premier ci-dessus.</p>}
      </div>
    </div>
  )
}
