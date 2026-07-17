import type { ToastMessage } from '../../types/domain'

interface ToastProps {
  toast: ToastMessage | null
}

export function Toast({ toast }: ToastProps) {
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      <span className="toast-icon">OK</span>
      <span>
        <strong>{toast?.title ?? 'Action complete'}</strong>
        <small>{toast?.detail ?? 'Your collector dashboard has been updated.'}</small>
      </span>
    </div>
  )
}
