import { CalendarX2 } from 'lucide-react'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function parseISO(value: string): { j: string; m: string; a: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return { j: '', m: '', a: '' }
  return { a: m[1], m: String(Number(m[2])), j: String(Number(m[3])) }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

interface Props {
  label: string
  /** Date ISO YYYY-MM-DD, ou '' si vide */
  value: string
  onChange: (iso: string) => void
  yearFrom: number
  yearTo: number
  /** Bouton "Aujourd'hui" (utile pour l'inscription) */
  todayButton?: boolean
  /** Bouton effacer (utile pour la naissance) */
  clearable?: boolean
  /** Affiche l'âge calculé sous le champ (naissance) */
  showAge?: boolean
}

export default function DateSelect({ label, value, onChange, yearFrom, yearTo, todayButton, clearable, showAge }: Props) {
  const { j, m, a } = parseISO(value)

  const years: number[] = []
  for (let y = yearTo; y >= yearFrom; y--) years.push(y)

  const emit = (jj: string, mm: string, aa: string) => {
    if (!jj || !mm || !aa) {
      // Sélection incomplète : on vide (laisse papa choisir tranquillement)
      if (!jj && !mm && !aa) onChange('')
      return
    }
    let day = Number(jj)
    const max = daysInMonth(Number(aa), Number(mm))
    if (day > max) day = max // ex : 30 fév → 28/29
    onChange(`${aa}-${pad2(Number(mm))}-${pad2(day)}`)
  }

  const age = (() => {
    if (!showAge || !value) return null
    const d = new Date(value + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return null
    let age = new Date().getFullYear() - d.getFullYear()
    const thisYear = new Date(new Date().getFullYear(), d.getMonth(), d.getDate())
    if (new Date() < thisYear) age--
    return age >= 0 && age < 120 ? age : null
  })()

  const today = () => {
    const t = new Date()
    onChange(`${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`)
  }

  return (
    <div>
      <label>{label}{age !== null && <span className="muted"> — {age} ans</span>}</label>
      <div className="dateselect">
        <select aria-label="Jour" value={j} onChange={(e) => emit(e.target.value, m, a)}>
          <option value="">Jour</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Mois" value={m} onChange={(e) => emit(j, e.target.value, a)}>
          <option value="">Mois</option>
          {MOIS_FR.map((nom, i) => (
            <option key={nom} value={i + 1}>{nom}</option>
          ))}
        </select>
        <select aria-label="Année" value={a} onChange={(e) => emit(j, m, e.target.value)}>
          <option value="">Année</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {(todayButton || clearable) && (
        <div className="date-actions">
          {todayButton && <button type="button" className="small" onClick={today}>Aujourd'hui</button>}
          {clearable && value && (
            <button type="button" className="small" onClick={() => onChange('')}>
              <CalendarX2 size={14} className="btn-ico" />Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
