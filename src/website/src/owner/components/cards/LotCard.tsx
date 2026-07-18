import { MaterialBadge } from '../common/MaterialBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { PlasticLot, SmartBin } from '../../types/domain'
import { formatCurrency, formatKg, formatPlasticBreakdown, getLotValue } from '../../utils/format'

interface LotCardProps {
  lot: PlasticLot
  bin?: SmartBin
  onEdit: (lotId: string) => void
  onWithdraw: (lotId: string) => void
  onStartPayment?: (lotId: string) => void
}

export function LotCard({ lot, bin, onEdit, onWithdraw, onStartPayment }: LotCardProps) {
  return (
    <article className="lot">
      <div className="lot-top">
        <MaterialBadge material={lot.material} />
        <div>
          <strong>{lot.title}</strong>
          <small>{bin?.label ?? 'Smart bin'} - {lot.pickupWindow}</small>
        </div>
        <div className="lot-price">
          <b>{formatCurrency(getLotValue(lot))}</b>
          <StatusBadge label={lot.status} tone={lot.status} />
        </div>
      </div>
      <div className="lot-meta">
        <span>{formatCurrency(lot.pricePerKg)}/kg</span>
        <span>Total {formatKg(lot.quantityKg)}</span>
        <span>{lot.views} collector views</span>
        <span>{lot.publishedAt}</span>
        {lot.publicationSource ? <span>{lot.publicationSource.replace('_', ' ')}</span> : null}
      </div>
      <div className="breakdown-line">
        <strong>Plastic breakdown</strong>
        <span>{formatPlasticBreakdown(lot)}</span>
      </div>
      <div className="lot-bottom">
        <span className="supplier">
          {lot.paymentRequired ? 'FLEX payment required before publication' : `Pickup window: ${lot.pickupWindow}`}
        </span>
        <div className="lot-actions">
          <button className="mini-btn" type="button" onClick={() => onEdit(lot.id)}>
            Edit weights
          </button>
          {lot.paymentRequired && onStartPayment ? (
            <button className="mini-btn accept" type="button" onClick={() => onStartPayment(lot.id)}>
              Pay FLEX
            </button>
          ) : null}
          <button className="mini-btn" disabled={lot.status === 'withdrawn'} type="button" onClick={() => onWithdraw(lot.id)}>
            Withdraw
          </button>
        </div>
      </div>
    </article>
  )
}
