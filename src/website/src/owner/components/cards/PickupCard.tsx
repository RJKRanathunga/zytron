import { StatusBadge } from '../common/StatusBadge'
import type { Pickup } from '../../types/domain'

interface PickupCardProps {
  pickup: Pickup
  onProgress: (pickupId: string) => void
}

export function PickupCard({ pickup, onProgress }: PickupCardProps) {
  return (
    <article className="request">
      <span className="request-avatar">{pickup.collectorInitials}</span>
      <div>
        <strong>{pickup.collectorName}</strong>
        <small>
          {pickup.dateLabel} - {pickup.timeWindow} - code {pickup.handoverCode}
        </small>
        <div className="progress">
          <i style={{ width: `${pickup.progressPercent}%` }}></i>
        </div>
        <div className="request-actions">
          <button className="mini-btn accept" type="button" onClick={() => onProgress(pickup.id)}>
            Update progress
          </button>
        </div>
      </div>
      <div className="request-price">
        <StatusBadge label={pickup.status} tone={pickup.status} />
      </div>
    </article>
  )
}
