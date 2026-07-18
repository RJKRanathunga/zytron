import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/common/StatusBadge'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function PickupDetails() {
  const { pickupId } = useParams()
  const app = useOwnerApp()
  const navigate = useNavigate()
  const pickup = app.pickups.find((item) => item.id === pickupId)

  if (!pickup) return <Navigate to="/owner/pickups" replace />

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Pickup detail</span>
          <h1>{pickup.collectorName}</h1>
          <p>Handover code, timing and progress for the scheduled pickup.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/owner/pickups')}>
            Back to pickups
          </button>
          <button className="btn primary" type="button" onClick={() => app.updatePickupProgress(pickup.id)}>
            Update progress
          </button>
        </div>
      </section>
      <section className="panel detail-panel">
        <div className="summary-grid wide">
          <div>
            <small>Date</small>
            <strong>{pickup.dateLabel}</strong>
          </div>
          <div>
            <small>Window</small>
            <strong>{pickup.timeWindow}</strong>
          </div>
          <div>
            <small>Handover code</small>
            <strong>{pickup.handoverCode}</strong>
          </div>
          <div>
            <small>Status</small>
            <StatusBadge label={pickup.status} tone={pickup.status} />
          </div>
        </div>
        <div className="progress large">
          <i style={{ width: `${pickup.progressPercent}%` }}></i>
        </div>
      </section>
    </div>
  )
}
