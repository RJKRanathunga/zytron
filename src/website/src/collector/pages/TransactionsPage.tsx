import { BarChart } from '../components/charts/BarChart'
import { TransactionRow } from '../components/cards/TransactionRow'
import { MetricCard } from '../components/cards/MetricCard'
import { useCollectorApp } from '../hooks/useCollectorApp'
import { formatCurrency } from '../utils/format'

export function TransactionsPage() {
  const app = useCollectorApp()
  const totalSpend = app.transactions.reduce((total, transaction) => total + transaction.amount, 0)
  const pending = app.transactions
    .filter((transaction) => transaction.status !== 'paid')
    .reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Purchases and payments</span>
          <h1>Track spend, pending holds and completed plastic purchases.</h1>
          <p>Mock transaction data is ready to swap with Flask payment and reservation endpoints later.</p>
        </div>
      </section>

      <section className="metrics">
        <MetricCard tone="violet" icon="$" label="Total scheduled spend" value={formatCurrency(totalSpend)} detail="All visible transactions" />
        <MetricCard tone="sun" icon="H" label="Pending holds" value={formatCurrency(pending)} detail="Awaiting pickup handover" />
        <MetricCard tone="mint" icon="P" label="Completed pickups" value="1" detail="Paid this week" />
        <MetricCard tone="blue" icon="M" label="Average price" value="Rs. 99/kg" detail="Across current route" />
      </section>

      <section className="grid-main">
        <article className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Ledger</span>
              <h3>Transaction summary</h3>
            </div>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Purchase</th>
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
          <small>Weekly purchase volume</small>
          <strong>{formatCurrency(totalSpend)}</strong>
          <small>Route spend is highest when PP and PET are collected together.</small>
          <BarChart label="Weekly collector spend" values={[2800, 3420, 2676, 4770, 6280, 5230, 7600]} captions={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now']} />
        </article>
      </section>
    </div>
  )
}
