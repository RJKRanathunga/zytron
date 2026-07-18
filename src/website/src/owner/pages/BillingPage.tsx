import { useEffect, useState } from 'react'
import { StatusBadge } from '../components/common/StatusBadge'
import { ownerService } from '../services/ownerService'
import type { SellerBilling } from '../types/domain'
import { formatCurrency } from '../utils/format'

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set'
}

export function BillingPage() {
  const [billing, setBilling] = useState<SellerBilling | null>(null)
  const [message, setMessage] = useState('')

  const loadBilling = () => {
    void ownerService.loadBilling().then(setBilling).catch(() => setMessage('Billing data could not be loaded.'))
  }

  useEffect(loadBilling, [])

  const cancelSubscription = async () => {
    try {
      setBilling(await ownerService.cancelSubscription())
      setMessage('ZYTRON PRO will remain active until the current paid period ends.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Subscription could not be cancelled.')
    }
  }

  const changePackage = async () => {
    try {
      const session = await ownerService.createSubscriptionCheckout()
      setMessage(`ZYTRON PRO checkout created at ${session.checkoutUrl}.`)
      loadBilling()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout could not be created.')
    }
  }

  if (!billing) {
    return (
      <div className="page">
        <section className="heading">
          <div>
            <span className="eyebrow">Seller billing</span>
            <h1>Loading billing workspace.</h1>
            <p>{message || 'Current package, payments and subscription history are syncing.'}</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Seller billing</span>
          <h1>Manage packages, subscription access and listing payments.</h1>
          <p>Package and payment rules are enforced by the backend before any listing is published.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={loadBilling}>
            Refresh
          </button>
          <button className="btn primary" type="button" onClick={changePackage}>
            Change package
          </button>
        </div>
      </section>

      <section className="billing-summary">
        <article className="panel">
          <span className="eyebrow">Current package</span>
          <h3>{billing.currentPackage?.name ?? 'ZYTRON FLEX'}</h3>
          <p>{billing.currentPackage?.description ?? 'Pay per advertisement when a listing needs publication.'}</p>
          <StatusBadge label={billing.activeSubscription?.status ?? 'flex'} tone={billing.activeSubscription ? 'active' : 'scheduled'} />
        </article>
        <article className="panel">
          <span className="eyebrow">Subscription</span>
          <h3>{dateLabel(billing.activeSubscription?.currentPeriodEnd ?? null)}</h3>
          <p>{billing.activeSubscription?.cancelAtPeriodEnd ? 'Cancellation scheduled at period end.' : 'No cancellation scheduled.'}</p>
          <button className="mini-btn" disabled={!billing.activeSubscription} type="button" onClick={cancelSubscription}>
            Cancel subscription
          </button>
        </article>
        <article className="panel">
          <span className="eyebrow">Listings</span>
          <h3>{billing.publishedListingCount} published</h3>
          <p>{billing.draftListingCount} drafts and {billing.pendingPaymentCount} pending payments.</p>
        </article>
      </section>

      {message ? <p className="page-note">{message}</p> : null}

      <section className="grid-equal">
        <div className="panel responsive-table">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Payment history</span>
              <h3>Transactions</h3>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Provider</th>
              </tr>
            </thead>
            <tbody>
              {billing.paymentHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.transactionType.replace('_', ' ')}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.status}</td>
                  <td>{item.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel responsive-table">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Subscription history</span>
              <h3>Package periods</h3>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Status</th>
                <th>Start</th>
                <th>Period end</th>
              </tr>
            </thead>
            <tbody>
              {billing.subscriptionHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.package.name}</td>
                  <td>{item.status}</td>
                  <td>{dateLabel(item.startedAt)}</td>
                  <td>{dateLabel(item.currentPeriodEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
