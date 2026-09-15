// Types metier — Gestion Papa (cours particuliers, francais)

export interface Group {
  id: number
  nom: string
  matiere: string
  jour: string
  heure: string
  capacite: number
}

export interface Student {
  id: number
  nom: string
  prenom: string
  naissance: string
  tel: string
  parent_tel: string
  adresse: string
  /** Photo d'identite compressee (dataURL JPEG), stockee dans SQLite */
  photo: string
  groupe_id: number | null
  inscription_date: string
  remarques: string
}

export interface AttendanceRow {
  id: number
  student_id: number
  date: string // YYYY-MM-DD
  statut: 'present' | 'absent'
}

export interface PaymentRow {
  id: number
  student_id: number
  mois: string // YYYY-MM
  montant: number
  statut: 'paye' | 'impaye'
  date_paiement: string
}

export interface GradeRow {
  id: number
  student_id: number
  evaluation: string
  note: number
  date: string // YYYY-MM-DD
}

export type TabKey =
  | 'dashboard'
  | 'eleves'
  | 'groupes'
  | 'presences'
  | 'paiements'
  | 'notes'
