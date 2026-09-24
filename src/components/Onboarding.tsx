import { ArrowRight, BookOpenText, Check, Plus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { addGroup, addStudent, todayISO } from '../lib/db'
import { toast } from '../lib/toast'

const JOURS = ['Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

/** Assistant de première utilisation — base vide uniquement. */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  const [groupeNom, setGroupeNom] = useState('')
  const [matiere, setMatiere] = useState('Français')
  const [jour, setJour] = useState(JOURS[new Date().getDay()])
  const [heure, setHeure] = useState('')

  const [eleveNom, setEleveNom] = useState('')
  const [elevePrenom, setElevePrenom] = useState('')
  const [parentTel, setParentTel] = useState('')

  const createGroup = () => {
    if (!groupeNom.trim()) { toast('Le nom du groupe est obligatoire.', 'error'); return }
    addGroup({ nom: groupeNom.trim(), matiere, jour, heure, capacite: 0 })
    setStep(2)
  }

  const createStudent = () => {
    if (!eleveNom.trim()) { toast("Le nom de l'élève est obligatoire.", 'error'); return }
    addStudent({
      nom: eleveNom.trim(), prenom: elevePrenom.trim(), naissance: '', tel: '',
      parent_tel: parentTel.trim(), adresse: '', photo: '', groupe_id: null,
      inscription_date: todayISO(), remarques: '',
    })
    setStep(3)
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-steps" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`step-dot ${i <= step ? 'on' : ''}`} />)}
        </div>

        {step === 0 && (
          <>
            <BookOpenText size={44} color="var(--primary)" />
            <h2>Bienvenue dans Gestion Ayachi</h2>
            <p className="muted">
              Votre carnet de cours numérique — 100 % hors-ligne, vos données restent sur ce PC.
            </p>
            <ul className="onboarding-list">
              <li><Users size={16} className="btn-ico" /> Créez vos groupes (jour + heure)</li>
              <li><UserPlus size={16} className="btn-ico" /> Inscrivez vos élèves avec photo</li>
              <li><Check size={16} className="btn-ico" /> Faites l'appel, suivez paiements et notes</li>
            </ul>
            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={onDone}>Passer pour l'instant</button>
              <button className="primary" onClick={() => setStep(1)}>
                Commencer <ArrowRight size={16} className="btn-ico" />
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Plus size={36} color="var(--primary)" />
            <h2>Créez votre premier groupe</h2>
            <p className="muted">Ex : « Groupe Samedi 10h ». Vous pourrez en créer d'autres ensuite.</p>
            <div className="grid2" style={{ marginTop: 12 }}>
              <div>
                <label>Nom du groupe *</label>
                <input value={groupeNom} onChange={(e) => setGroupeNom(e.target.value)} placeholder="Ex : Samedi 10h" autoFocus />
              </div>
              <div>
                <label>Matière</label>
                <input value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Français" />
              </div>
              <div>
                <label>Jour</label>
                <select value={jour} onChange={(e) => setJour(e.target.value)}>
                  {JOURS.map((j) => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label>Heure</label>
                <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={onDone}>Passer</button>
              <button className="primary" onClick={createGroup}>
                Créer et continuer <ArrowRight size={16} className="btn-ico" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <UserPlus size={36} color="var(--primary)" />
            <h2>Ajoutez votre premier élève</h2>
            <p className="muted">Seul le nom est obligatoire — le reste se complète plus tard.</p>
            <div className="grid2" style={{ marginTop: 12 }}>
              <div>
                <label>Nom *</label>
                <input value={eleveNom} onChange={(e) => setEleveNom(e.target.value)} placeholder="Ex : Benali" autoFocus />
              </div>
              <div>
                <label>Prénom</label>
                <input value={elevePrenom} onChange={(e) => setElevePrenom(e.target.value)} placeholder="Ex : Yasmine" />
              </div>
              <div>
                <label>Téléphone parent</label>
                <input value={parentTel} onChange={(e) => setParentTel(e.target.value)} placeholder="06XX XX XX XX" />
              </div>
            </div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={onDone}>Passer</button>
              <button className="primary" onClick={createStudent}>
                Ajouter et continuer <ArrowRight size={16} className="btn-ico" />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="onboarding-check"><Check size={44} color="#fff" /></div>
            <h2>Tout est prêt !</h2>
            <p className="muted">
              Votre premier groupe et votre premier élève sont enregistrés. Explorez les onglets en haut
              pour faire l'appel, suivre les paiements et les notes.
            </p>
            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="primary" onClick={onDone}>
                Ouvrir le tableau de bord <ArrowRight size={16} className="btn-ico" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
