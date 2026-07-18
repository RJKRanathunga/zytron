import { MaterialBadge } from '../common/MaterialBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { PlasticLot, SmartBin } from '../../types/domain'
import { formatCurrency, formatKg, getLotValue } from '../../utils/format'

interface LotCardProps {
  lot: PlasticLot
  bin?: SmartBin
  onWithdraw: (lotId: string) => void
}

export function LotCard({ lot, bin, onWithdraw }: LotCardProps) {
  return (
    <article className="lot">
      <div className="lot-top">
        <MaterialBadge material={lot.material} />
        <div>
          <strong>{formatKg(lot.quantityKg)} {lot.material} lot</strong>
          <small>{bin?.label ?? 'Smart bin'} - {lot.pickupWindow}</small>
        </div>
        <div className="lot-price">
          <b>{formatCurrency(getLotValue(lot))}</b>
          <StatusBadge label={lot.status} tone={lot.status} />
        </div>
      </div>
      <div className="lot-meta">
        <span>{formatCurrency(lot.pricePerKg)}/kg</span>
        <span>{lot.views} collector views</span>
        <span>{lot.publishedAt}</span>
      </div>
      <div className="lot-bottom">
        <span className="supplier">Pickup window: {lot.pickupWindow}</span>
        <button className="mini-btn" disabled={lot.status === 'withdrawn'} type="button" onClick={() => onWithdraw(lot.id)}>
          Withdraw
        </button>
      </div>
    </article>
  )
}
