interface EmptyStateProps {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <span className="empty-icon">0</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <button className="btn secondary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
