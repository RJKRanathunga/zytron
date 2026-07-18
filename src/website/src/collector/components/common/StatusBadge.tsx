import type { LotStatus, PickupStatus, TransactionStatus } from '../../types/domain'

type BadgeTone = LotStatus | PickupStatus | TransactionStatus | 'saved' | 'active' | 'warning'

interface StatusBadgeProps {
  label: string
  tone: BadgeTone
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status ${tone}`}>{label}</span>
}
