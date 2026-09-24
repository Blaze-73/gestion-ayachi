// Toast global — remplace alert() et confirm() natives.

export type ToastKind = 'ok' | 'error' | 'info'

export interface ToastItem {
  id: number
  msg: string
  kind: ToastKind
  confirm?: boolean
  resolve?: (v: boolean) => void
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()
let nextId = 1

const emit = () => listeners.forEach((l) => l())

export const subscribeToasts = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
export const getToasts = () => toasts

const remove = (id: number) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** Notification éphémère (3,5 s). */
export function toast(msg: string, kind: ToastKind = 'ok') {
  const id = nextId++
  toasts = [...toasts, { id, msg, kind }]
  emit()
  setTimeout(() => remove(id), 3500)
}

/** Remplace confirm() natif — résout true/false. Reste affiché jusqu'à réponse. */
export function confirmDialog(msg: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++
    toasts = [...toasts, { id, msg, kind: 'info', confirm: true, resolve }]
    emit()
  })
}

export function answerToast(id: number, yes: boolean) {
  const t = toasts.find((x) => x.id === id)
  t?.resolve?.(yes)
  remove(id)
}
