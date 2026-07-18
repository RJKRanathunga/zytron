import { StatusBadge } from '../common/StatusBadge'
import type { Pickup } from '../../types/domain'
import { formatCurrency, formatKg } from '../../utils/format'

interface PickupCardProps {
  pickup: Pickup
  onOpen: (pickupId: string) => void
  onCancel?: (pickupId: string) => void
}

export function PickupCard({ pickup, onOpen, onCancel }: PickupCardProps) {
  const canCancel = pickup.status === 'confirmed' || pickup.status === 'awaiting'

  return (
    <article className="request">
      <span className="request-avatar">{pickup.pointInitials}</span>
      <div>
        <strong>{pickup.pointName}</strong>
        <small>
          {pickup.dateLabel} - {pickup.timeWindow} - {formatKg(pickup.quantityKg)} {pickup.material}
        </small>
        <div className="request-actions">
          <button className="mini-btn accept" type="button" onClick={() => onOpen(pickup.id)}>
            Open pickup
          </button>
          {canCancel && onCancel ? (
            <button className="mini-btn" type="button" onClick={() => onCancel(pickup.id)}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      <div className="request-price">
        <b>{formatCurrency(pickup.price)}</b>
        <StatusBadge label={pickup.status} tone={pickup.status} />
      </div>
    </article>
  )
}
