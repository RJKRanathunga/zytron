import type { CollectionPoint, PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg, getLotValue } from '../../utils/format'

interface SupplyMapProps {
  lots: PlasticLot[]
  points: CollectionPoint[]
  selectedLotId?: string
  routeLotIds: string[]
  onSelectLot: (lotId: string) => void
  onAddToRoute: (lotId: string) => void
}

export function SupplyMap({
  lots,
  points,
  selectedLotId,
  routeLotIds,
  onSelectLot,
  onAddToRoute,
}: SupplyMapProps) {
  return (
    <article className="panel map-panel">
      <div className="map-bg"></div>
      <i className="route-path"></i>
      {lots.map((lot) => {
        const point = points.find((item) => item.id === lot.collectionPointId)
        if (!point) return null

        return (
          <button
            aria-pressed={lot.id === selectedLotId}
            className={`map-pin-card ${lot.id === selectedLotId ? 'selected' : ''} ${
              routeLotIds.includes(lot.id) ? 'in-route' : ''
            }`}
            key={lot.id}
            style={{ left: `${point.coordinates.x}%`, top: `${point.coordinates.y}%` }}
            type="button"
            onClick={() => onSelectLot(lot.id)}
          >
            <span className="dot">{lot.material}</span>
            <span>
              <b>
                {point.name} - {formatKg(lot.quantityKg)}
              </b>
              <small>
                {point.distanceKm.toFixed(1)} km - {formatCurrency(lot.pricePerKg)}/kg
              </small>
            </span>
          </button>
        )
      })}
      <div className="map-controls">
        <button type="button" onClick={() => selectedLotId && onAddToRoute(selectedLotId)}>
          +
        </button>
        <button type="button" onClick={() => selectedLotId && onSelectLot(selectedLotId)}>
          i
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-available"></i>Available
        </span>
        <span>
          <i className="legend-route"></i>In route
        </span>
        <span>
          <i className="legend-selected"></i>Selected
        </span>
      </div>
      {selectedLotId ? (
        <div className="map-selected-card">
          {(() => {
            const lot = lots.find((item) => item.id === selectedLotId)
            const point = lot ? points.find((item) => item.id === lot.collectionPointId) : undefined
            if (!lot) return null
            return (
              <>
                <strong>{lot.title}</strong>
                <small>{point?.name ?? 'Collection point'}</small>
                <b>{formatCurrency(getLotValue(lot))}</b>
                <button className="mini-btn accept" type="button" onClick={() => onAddToRoute(lot.id)}>
                  Add to route
                </button>
              </>
            )
          })()}
        </div>
      ) : null}
    </article>
  )
}
