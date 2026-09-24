import { X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { answerToast, getToasts, subscribeToasts } from '../lib/toast'

/** Hôte des toasts — monté une fois dans App. */
export default function ToastHost() {
  const list = useSyncExternalStore(subscribeToasts, getToasts)
  return (
    <div className="toast-host no-print" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-msg">{t.msg}</span>
          {t.confirm ? (
            <span className="toast-actions">
              <button className="small" onClick={() => answerToast(t.id, false)}>Annuler</button>
              <button className="small primary" onClick={() => answerToast(t.id, true)}>Confirmer</button>
            </span>
          ) : (
            <button className="toast-x" onClick={() => answerToast(t.id, false)} aria-label="Fermer">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
