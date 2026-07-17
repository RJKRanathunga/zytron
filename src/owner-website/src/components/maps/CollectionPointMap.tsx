import type { CollectionPoint, SmartBin } from '../../types/domain'

interface CollectionPointMapProps {
  points: CollectionPoint[]
  bins: SmartBin[]
  selectedPointId: string
  onSelect: (pointId: string) => void
}

export function CollectionPointMap({ points, bins, selectedPointId, onSelect }: CollectionPointMapProps) {
  return (
    <article className="panel map-panel">
      <div className="map-bg"></div>
      {points.map((point) => {
        const pointBins = bins.filter((bin) => bin.collectionPointId === point.id)
        return (
          <button
            aria-pressed={point.id === selectedPointId}
            className={`map-pin-card ${point.id === selectedPointId ? 'selected' : ''}`}
            key={point.id}
            style={{ left: `${point.coordinates.x}%`, top: `${point.coordinates.y}%` }}
            type="button"
            onClick={() => onSelect(point.id)}
          >
            <span className="dot">{pointBins.length}</span>
            <span>
              <b>{point.name}</b>
              <small>{pointBins.length} smart bins - {point.accessWindow}</small>
            </span>
          </button>
        )
      })}
      <div className="map-legend">
        <span>
          <i className="legend-available"></i>Collection point
        </span>
        <span>
          <i className="legend-selected"></i>Selected
        </span>
      </div>
    </article>
  )
}
