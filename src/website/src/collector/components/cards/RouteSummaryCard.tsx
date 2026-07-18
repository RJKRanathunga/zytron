import type { CollectionPoint, PlasticLot } from '../../types/domain'
import {
  formatCurrency,
  formatKg,
  getLotValue,
  getPointForLot,
  getRouteDistance,
  getRouteDriveTime,
} from '../../utils/format'

interface RouteSummaryCardProps {
  lots: PlasticLot[]
  points: CollectionPoint[]
  capacityKg: number
  title?: string
  onSave: () => void
  onRemove: (lotId: string) => void
}

export function RouteSummaryCard({
  lots,
  points,
  capacityKg,
  title = 'Suggested collection run',
  onSave,
  onRemove,
}: RouteSummaryCardProps) {
  const totalKg = lots.reduce((total, lot) => total + lot.quantityKg, 0)
  const totalValue = lots.reduce((total, lot) => total + getLotValue(lot), 0)
  const distance = getRouteDistance(lots, points)
  const capacityUse = Math.round((totalKg / capacityKg) * 100)

  return (
    <article className="route-card">
      <div className="route-head">
        <div>
          <span className="eyebrow light">Route planner</span>
          <h3>{title}</h3>
        </div>
        <span className="route-total">
          <strong>{formatKg(totalKg)}</strong>
          <small>{lots.length} planned stops</small>
        </span>
      </div>
      <div className="route-stops">
        {lots.map((lot, index) => {
          const point = getPointForLot(lot, points)
          return (
            <div className="stop" key={lot.id}>
              <span className="stop-num">{index + 1}</span>
              <span>
                <strong>{point?.name ?? lot.title}</strong>
                <small>
                  {lot.pickupWindow} - {formatKg(lot.quantityKg)} {lot.material}
                </small>
              </span>
              <button
                aria-label={`Remove ${lot.title} from route`}
                className="remove-stop"
                type="button"
                onClick={() => onRemove(lot.id)}
              >
                x
              </button>
            </div>
          )
        })}
      </div>
      <div className="route-summary">
        <span>
          Drive time<b>{getRouteDriveTime(distance)}</b>
        </span>
        <span>
          Purchase value<b>{formatCurrency(totalValue)}</b>
        </span>
        <span>
          Capacity use<b>{capacityUse}%</b>
        </span>
      </div>
      <button className="btn light" disabled={lots.length === 0} type="button" onClick={onSave}>
        Reserve and save route
      </button>
    </article>
  )
}
