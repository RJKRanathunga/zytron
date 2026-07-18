import { Link } from 'react-router-dom'
import { MaterialBadge } from '../common/MaterialBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { SmartBin } from '../../types/domain'
import { formatKg, getBinTotalKg } from '../../utils/format'

interface BinCardProps {
  bin: SmartBin
  onPublish: (binId: string) => void
}

export function BinCard({ bin, onPublish }: BinCardProps) {
  const readyCompartment = bin.compartments.find(
    (compartment) => compartment.status === 'ready' || compartment.fillLevel >= compartment.thresholdLevel,
  )

  return (
    <article className="bin-card">
      <div className="bin-head">
        <span className={`health ${bin.status}`}></span>
        <div>
          <Link className="card-link" to={`/owner/bins/${bin.id}`}>
            {bin.label}
          </Link>
          <small>{bin.location}</small>
        </div>
        <StatusBadge label={bin.status} tone={bin.status} />
      </div>
      <div className="compartment-list">
        {bin.compartments.map((compartment) => (
          <div className="material-row" key={compartment.id}>
            <MaterialBadge material={compartment.material} />
            <div>
              <strong>
                {formatKg(compartment.quantityKg)} {compartment.material}
              </strong>
              <div className="progress">
                <i style={{ width: `${compartment.fillLevel}%` }}></i>
              </div>
              <small>{compartment.fillLevel}% full</small>
            </div>
            <StatusBadge label={compartment.status} tone={compartment.status} />
          </div>
        ))}
      </div>
      <div className="bin-footer">
        <span>{formatKg(getBinTotalKg(bin))} total</span>
        <span>{bin.lastSync}</span>
        <button className="mini-btn accept" disabled={!readyCompartment} type="button" onClick={() => onPublish(bin.id)}>
          Publish
        </button>
      </div>
    </article>
  )
}
