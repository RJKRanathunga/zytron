import { Link } from 'react-router-dom'
import { MaterialBadge } from '../common/MaterialBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { CollectionPoint, PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg, formatPlasticBreakdown, getLotValue } from '../../utils/format'

interface LotCardProps {
  lot: PlasticLot
  point?: CollectionPoint
  isInRoute: boolean
  isReserved: boolean
  onReserve: (lotId: string) => void
  onRouteToggle: (lotId: string) => void
}

export function LotCard({
  lot,
  point,
  isInRoute,
  isReserved,
  onReserve,
  onRouteToggle,
}: LotCardProps) {
  const canReserve = lot.status !== 'sold' && !isReserved
  const statusLabel = isReserved ? 'Reserved by you' : lot.readinessLabel

  return (
    <article className="lot">
      <div className="lot-top">
        <MaterialBadge material={lot.material} />
        <div>
          <Link className="card-link" to={`/collector/marketplace/${lot.id}`}>
            {lot.title}
          </Link>
          <small>{point ? `${point.name} - ${point.address}` : 'Collection point'}</small>
        </div>
        <div className="lot-price">
          <b>{formatCurrency(getLotValue(lot))}</b>
          <StatusBadge label={statusLabel} tone={isReserved ? 'active' : lot.status} />
        </div>
      </div>
      <div className="lot-meta">
        {lot.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="breakdown-line">
        <strong>Plastic breakdown</strong>
        <span>{formatPlasticBreakdown(lot)}</span>
      </div>
      <div className="lot-bottom">
        <span className="supplier">
          <i>{point?.initials ?? '--'}</i>
          {point ? `${point.rating.toFixed(1)} rating - ${point.handovers} handovers` : 'Verified point'}
        </span>
        <span className="lot-actions">
          <button className="mini-btn" type="button" onClick={() => onRouteToggle(lot.id)}>
            {isInRoute ? 'Remove route' : 'Add route'}
          </button>
          <button
            className="reserve"
            disabled={!canReserve}
            type="button"
            onClick={() => onReserve(lot.id)}
          >
            {isReserved ? 'Reserved' : 'Reserve lot'}
          </button>
        </span>
      </div>
      <div className="lot-footnote">
        <span>{formatKg(lot.quantityKg)}</span>
        <span>{formatCurrency(lot.pricePerKg)}/kg</span>
        <span>{lot.qualityGrade}</span>
      </div>
    </article>
  )
}
