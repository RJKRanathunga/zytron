import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { MaterialBadge } from '../components/common/MaterialBadge'
import { StatusBadge } from '../components/common/StatusBadge'
import { SupplyMap } from '../components/maps/SupplyMap'
import { useCollectorApp } from '../hooks/useCollectorApp'
import { formatCurrency, formatKg, getLotValue, getPointForLot } from '../utils/format'

export function LotDetails() {
  const { lotId } = useParams()
  const app = useCollectorApp()
  const navigate = useNavigate()
  const lot = app.lots.find((item) => item.id === lotId)

  if (!lot) return <Navigate to="/marketplace" replace />

  const point = getPointForLot(lot, app.points)
  const reserved = app.pickups.some((pickup) => pickup.lotId === lot.id)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Lot details</span>
          <h1>{lot.title}</h1>
          <p>{point?.name ?? 'Verified collection point'} has this lot available for collector reservation.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/marketplace')}>
            Back to lots
          </button>
          <button className="btn primary" disabled={reserved} type="button" onClick={() => app.openReserveModal(lot.id)}>
            {reserved ? 'Already reserved' : 'Reserve lot'}
          </button>
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel detail-panel">
          <MaterialBadge material={lot.material} />
          <h2>{lot.qualityGrade}</h2>
          <div className="summary-grid wide">
            <div>
              <small>Quantity</small>
              <strong>{formatKg(lot.quantityKg)}</strong>
            </div>
            <div>
              <small>Price per kg</small>
              <strong>{formatCurrency(lot.pricePerKg)}</strong>
            </div>
            <div>
              <small>Total purchase</small>
              <strong>{formatCurrency(getLotValue(lot))}</strong>
            </div>
            <div>
              <small>Demand score</small>
              <strong>{lot.demandScore}%</strong>
            </div>
          </div>
          <div className="detail-list">
            <span>
              <b>Status</b>
              <StatusBadge label={reserved ? 'Reserved by you' : lot.readinessLabel} tone={reserved ? 'active' : lot.status} />
            </span>
            <span>
              <b>Pickup window</b>
              {lot.pickupWindow}
            </span>
            <span>
              <b>Point access</b>
              {point?.accessNote ?? 'Access details available after reservation.'}
            </span>
            <span>
              <b>Closes</b>
              {lot.closesAt}
            </span>
          </div>
          <div className="lot-meta">
            {lot.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="detail-actions">
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                app.routeLotIds.includes(lot.id) ? app.removeLotFromRoute(lot.id) : app.addLotToRoute(lot.id)
              }
            >
              {app.routeLotIds.includes(lot.id) ? 'Remove from route' : 'Add to route'}
            </button>
            <button className="btn primary" disabled={reserved} type="button" onClick={() => app.openReserveModal(lot.id)}>
              Send reservation
            </button>
          </div>
        </article>

        <SupplyMap
          lots={app.lots}
          points={app.points}
          routeLotIds={app.routeLotIds}
          selectedLotId={lot.id}
          onSelectLot={(nextLotId) => navigate(`/marketplace/${nextLotId}`)}
          onAddToRoute={app.addLotToRoute}
        />
      </section>
    </div>
  )
}
