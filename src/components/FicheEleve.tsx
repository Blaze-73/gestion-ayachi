import { useEffect, useState } from 'react'
import { attendanceForStudent, averageForStudent, getStudent, listGroups, paymentsForStudent } from '../lib/db'
import type { Group, Student } from '../lib/types'

/** Fiche eleve A4 imprimable : profil + photo + resume presences/paiements/notes + signature. */
export default function FicheEleve({ studentId }: { studentId: number }) {
  const [student, setStudent] = useState<Student | undefined>()
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    setStudent(getStudent(studentId))
    setGroups(listGroups())
  }, [studentId])

  if (!student) return <p className="muted">Élève introuvable.</p>
  const groupe = groups.find((g) => g.id === student.groupe_id)
  const presences = attendanceForStudent(student.id)
  const nbPresent = presences.filter((p) => p.statut === 'present').length
  const paiements = paymentsForStudent(student.id)
  const moyenne = averageForStudent(student.id)

  return (
    <div className="fiche">
      <header>
        <div>
          <h2>Fiche Élève</h2>
          <div className="muted">Gestion des cours particuliers — Année {new Date().getFullYear()}</div>
          <div className="muted">Inscrit le : {student.inscription_date || '—'}</div>
        </div>
        {student.photo
          ? <img src={student.photo} className="fiche-photo" alt="Photo élève" />
          : <div className="fiche-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="muted">Photo</span></div>}
      </header>

      <h3>Informations</h3>
      <dl>
        <dt>Nom & prénom</dt><dd>{student.prenom} {student.nom}</dd>
        <dt>Naissance</dt><dd>{student.naissance || '—'}</dd>
        <dt>Téléphone</dt><dd>{student.tel || '—'}</dd>
        <dt>Tél. parent</dt><dd>{student.parent_tel || '—'}</dd>
        <dt>Adresse</dt><dd>{student.adresse || '—'}</dd>
        <dt>Groupe</dt><dd>{groupe ? `${groupe.nom} — ${groupe.jour} ${groupe.heure}` : '—'}</dd>
        <dt>Remarques</dt><dd>{student.remarques || '—'}</dd>
      </dl>

      <h3>Scolarité</h3>
      <dl>
        <dt>Présences (20 dernières)</dt><dd>{nbPresent} présent(s) / {presences.length} séance(s)</dd>
        <dt>Moyenne</dt><dd>{moyenne !== null ? `${moyenne.toFixed(2)} / 20` : '—'}</dd>
        <dt>Dernier paiement</dt>
        <dd>{paiements[0] ? `${paiements[0].mois} — ${paiements[0].montant} DA (${paiements[0].statut === 'paye' ? 'payé' : 'impayé'})` : '—'}</dd>
      </dl>

      <div className="sign">
        <div>Signature du parent :<br /><br />______________________</div>
        <div>Signature du professeur :<br /><br />______________________</div>
      </div>
    </div>
  )
}
