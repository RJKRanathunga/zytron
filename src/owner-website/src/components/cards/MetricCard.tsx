interface MetricCardProps {
  tone: 'mint' | 'sun' | 'blue' | 'violet' | 'coral'
  icon: string
  label: string
  value: string
  detail: string
}

export function MetricCard({ tone, icon, label, value, detail }: MetricCardProps) {
  return (
    <article className={`metric ${tone}`}>
      <span className="metric-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </article>
  )
}
