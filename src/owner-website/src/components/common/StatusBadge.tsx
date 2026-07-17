import type { BinStatus, LotStatus, OfferStatus, PickupStatus, TransactionStatus } from '../../types/domain'

type BadgeTone =
  | BinStatus
  | LotStatus
  | OfferStatus
  | PickupStatus
  | TransactionStatus
  | 'ready'
  | 'growing'
  | 'reserved'
  | 'warning'

interface StatusBadgeProps {
  label: string
  tone: BadgeTone
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status ${tone}`}>{label}</span>
}
