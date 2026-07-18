import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ownerService } from '../services/ownerService'
import type { SellerPackage } from '../types/domain'
import { formatCurrency } from '../utils/format'

export function PricingPage() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState<SellerPackage[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    void ownerService.loadPackages().then(setPackages).catch(() => setMessage('Package configuration could not be loaded.'))
  }, [])

  const pro = packages.find((item) => item.code === 'ZYTRON_PRO')
  const flex = packages.find((item) => item.code === 'ZYTRON_FLEX')

  const choosePro = async () => {
    try {
      const session = await ownerService.createSubscriptionCheckout()
      setMessage(`ZYTRON PRO checkout created at ${session.checkoutUrl}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout could not be created.')
    }
  }

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Seller packages</span>
          <h1>A flexible listing model serves both regular and occasional sellers.</h1>
          <p>Buyers can browse and connect with sellers under the initial marketplace model.</p>
        </div>
      </section>
      <section className="pricing-grid">
        {pro ? (
          <article className="pricing-plan">
            <span className="eyebrow">Monthly subscription</span>
            <h2>{pro.name}</h2>
            <strong>{formatCurrency(pro.price)} / month</strong>
            <p>{pro.description}</p>
            <ul>
              <li>Unlimited or high-volume advertisements</li>
              <li>Seller dashboard</li>
              <li>Listing management</li>
              <li>Billing and subscription history</li>
            </ul>
            <button className="btn primary full" type="button" onClick={choosePro}>
              Choose ZYTRON PRO
            </button>
          </article>
        ) : null}
        {flex ? (
          <article className="pricing-plan">
            <span className="eyebrow">Pay per advertisement</span>
            <h2>{flex.name}</h2>
            <strong>{formatCurrency(flex.price)} / advertisement</strong>
            <p>{flex.description}</p>
            <ul>
              <li>No monthly commitment</li>
              <li>Marketplace buyer access</li>
              <li>Basic listing management</li>
              <li>Payment applies to one listing</li>
            </ul>
            <button className="btn secondary full" type="button" onClick={() => navigate('/owner/lots')}>
              Choose ZYTRON FLEX
            </button>
          </article>
        ) : null}
      </section>
      {message ? <p className="page-note">{message}</p> : null}
    </div>
  )
}
