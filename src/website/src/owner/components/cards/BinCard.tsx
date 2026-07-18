import { Link } from 'react-router-dom'
import { MaterialBadge } from '../common/MaterialBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { SmartBin } from '../../types/domain'
import { formatKg, getBinTotalKg } from '../../utils/format'

interface BinCardProps {
  bin: SmartBin
  onPublish: (binId: string) => void
  onEdit?: (binId: string) => void
  onRemove?: (bin: SmartBin) => void
}

export function BinCard({ bin, onPublish, onEdit, onRemove }: BinCardProps) {
  const canPublish = bin.status !== 'inactive'

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
        {onEdit ? (
          <button className="mini-btn" type="button" onClick={() => onEdit(bin.id)}>
            Edit
          </button>
        ) : null}
        {onRemove ? (
          <button className="mini-btn danger" disabled={bin.status === 'inactive'} type="button" onClick={() => onRemove(bin)}>
            Remove
          </button>
        ) : null}
        <button className="mini-btn accept" disabled={!canPublish} type="button" onClick={() => onPublish(bin.id)}>
          Publish
        </button>
      </div>
    </article>
  )
}
