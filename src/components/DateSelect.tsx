import { CalendarX2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function parseISO(value: string): { j: string; m: string; a: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return { j: '', m: '', a: '' }
  return { a: match[1], m: String(Number(match[2])), j: String(Number(match[3])) }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

interface Props {
  label: string
  value: string
  onChange: (iso: string) => void
  yearFrom: number
  yearTo: number
  todayButton?: boolean
  clearable?: boolean
  showAge?: boolean
}

export default function DateSelect({ label, value, onChange, yearFrom, yearTo, todayButton, clearable, showAge }: Props) {
  const parsed = parseISO(value)

  // Internal state lets each select update independently without requiring all three
  const [j, setJ] = useState(parsed.j)
  const [m, setM] = useState(parsed.m)
  const [a, setA] = useState(parsed.a)

  // Sync when value changes externally (e.g. editing a student)
  useEffect(() => {
    const p = parseISO(value)
    setJ(p.j); setM(p.m); setA(p.a)
  }, [value])

  const years: number[] = []
  for (let y = yearTo; y >= yearFrom; y--) years.push(y)

  const commit = (jj: string, mm: string, aa: string) => {
    if (jj && mm && aa) {
      let day = Number(jj)
      const max = daysInMonth(Number(aa), Number(mm))
      if (day > max) day = max
      onChange(`${aa}-${pad2(Number(mm))}-${pad2(day)}`)
    } else if (!jj && !mm && !aa) {
      onChange('')
    }
    // Partial selection: don't call onChange, just update internal UI
  }

  const changeJ = (v: string) => { setJ(v); commit(v, m, a) }
  const changeM = (v: string) => { setM(v); commit(j, v, a) }
  const changeA = (v: string) => { setA(v); commit(j, m, v) }

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
    const iso = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
    const p = parseISO(iso)
    setJ(p.j); setM(p.m); setA(p.a)
    onChange(iso)
  }

  const clear = () => {
    setJ(''); setM(''); setA('')
    onChange('')
  }

  return (
    <div>
      <label>{label}{age !== null && <span className="muted"> — {age} ans</span>}</label>
      <div className="dateselect">
        <select aria-label="Jour" value={j} onChange={(e) => changeJ(e.target.value)}>
          <option value="">Jour</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Mois" value={m} onChange={(e) => changeM(e.target.value)}>
          <option value="">Mois</option>
          {MOIS_FR.map((nom, i) => (
            <option key={nom} value={i + 1}>{nom}</option>
          ))}
        </select>
        <select aria-label="Année" value={a} onChange={(e) => changeA(e.target.value)}>
          <option value="">Année</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {(todayButton || clearable) && (
        <div className="date-actions">
          {todayButton && <button type="button" className="small" onClick={today}>Aujourd'hui</button>}
          {clearable && (j || m || a) && (
            <button type="button" className="small" onClick={clear}>
              <CalendarX2 size={14} className="btn-ico" />Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
