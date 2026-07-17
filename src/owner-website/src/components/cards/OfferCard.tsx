import { StatusBadge } from '../common/StatusBadge'
import type { CollectorOffer, PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg } from '../../utils/format'

interface OfferCardProps {
  offer: CollectorOffer
  lot?: PlasticLot
  onAccept: (offerId: string) => void
  onReject: (offerId: string) => void
}

export function OfferCard({ offer, lot, onAccept, onReject }: OfferCardProps) {
  return (
    <article className="request">
      <span className="request-avatar">{offer.collectorInitials}</span>
      <div>
        <strong>{offer.collectorName}</strong>
        <small>
          {lot ? `${formatKg(lot.quantityKg)} ${lot.material}` : 'Plastic lot'} - {offer.pickupWindow}
        </small>
        <div className="request-actions">
          <button
            className="mini-btn accept"
            disabled={offer.status !== 'new'}
            type="button"
            onClick={() => onAccept(offer.id)}
          >
            Accept
          </button>
          <button
            className="mini-btn"
            disabled={offer.status !== 'new'}
            type="button"
            onClick={() => onReject(offer.id)}
          >
            Reject
          </button>
        </div>
      </div>
      <div className="request-price">
        <b>{formatCurrency(offer.price)}</b>
        <small>{offer.rating.toFixed(1)} rating - {offer.completedPickups} pickups</small>
        <StatusBadge label={offer.status} tone={offer.status} />
      </div>
    </article>
  )
}
