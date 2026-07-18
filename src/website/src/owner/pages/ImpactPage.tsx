import { MetricCard } from '../components/cards/MetricCard'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function ImpactPage() {
  const app = useOwnerApp()

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Impact and community</span>
          <h1>Show the environmental value created by reliable bin operations.</h1>
          <p>Impact messaging stays supportive here while dashboards remain focused on actions and pickups.</p>
        </div>
      </section>
      <section className="metrics">
        {app.impactMetrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            tone={index === 0 ? 'mint' : index === 1 ? 'blue' : index === 2 ? 'sun' : 'violet'}
            icon={metric.label.slice(0, 1)}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </section>
      <section className="impact-card large">
        <span className="eyebrow light">Campus circularity</span>
        <h3>UoM Collection Hub is helping prove that smart-bin operations can be transparent, profitable and measurable.</h3>
        <p>
          The next backend step can connect verified weight readings, pickup confirmations and payout records to these
          impact metrics.
        </p>
        <div className="impact-stats">
          {app.impactMetrics.slice(0, 3).map((metric) => (
            <span key={metric.id}>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
