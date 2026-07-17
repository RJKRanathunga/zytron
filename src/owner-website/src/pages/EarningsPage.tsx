import { BarChart } from '../components/charts/BarChart'
import { MetricCard } from '../components/cards/MetricCard'
import { TransactionRow } from '../components/cards/TransactionRow'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useOwnerApp } from '../hooks/useOwnerApp'
import { formatCurrency } from '../utils/format'
import { useState } from 'react'

type Period = 'week' | 'month' | 'quarter'

const periods: readonly Period[] = ['week', 'month', 'quarter']

export function EarningsPage() {
  const app = useOwnerApp()
  const [period, setPeriod] = useState<Period>('month')
  const earned = app.transactions.reduce((total, transaction) => total + transaction.amount, 0)
  const pending = app.transactions
    .filter((transaction) => transaction.status !== 'paid')
    .reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Earnings</span>
          <h1>Track owner earnings and payout status.</h1>
          <p>Use period filters to inspect transaction performance and pending handover payouts.</p>
        </div>
        <SegmentedControl label="Earnings period" options={periods} value={period} onChange={setPeriod} />
      </section>
      <section className="metrics">
        <MetricCard tone="violet" icon="$" label="Value generated" value={formatCurrency(earned)} detail={`Selected period: ${period}`} />
        <MetricCard tone="sun" icon="P" label="Pending payout" value={formatCurrency(pending)} detail="Releases after handover" />
        <MetricCard tone="mint" icon="C" label="Completed pickups" value="2" detail="Paid transactions" />
        <MetricCard tone="blue" icon="A" label="Best offer" value="Rs. 113/kg" detail="Current PP lot" />
      </section>
      <section className="grid-main">
        <article className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {app.transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="earnings-box">
          <small>Value generated in July</small>
          <strong>{formatCurrency(earned)}</strong>
          <small>+16% compared with June - 4 completed pickups</small>
          <BarChart label="Weekly earnings chart" values={[1200, 2100, 1800, 3210, 2860, 2570, 3440]} captions={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now']} />
        </article>
      </section>
    </div>
  )
}
