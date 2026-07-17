import { StatusBadge } from '../common/StatusBadge'
import type { Transaction } from '../../types/domain'
import { formatCurrency } from '../../utils/format'

interface TransactionRowProps {
  transaction: Transaction
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  return (
    <tr>
      <td>
        <strong>{transaction.title}</strong>
        <small>{transaction.method}</small>
      </td>
      <td>{transaction.dateLabel}</td>
      <td>{formatCurrency(transaction.amount)}</td>
      <td>
        <StatusBadge label={transaction.status} tone={transaction.status} />
      </td>
    </tr>
  )
}
