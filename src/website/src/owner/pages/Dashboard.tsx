import { useNavigate } from 'react-router-dom'
import { BinCard } from '../components/cards/BinCard'
import { MetricCard } from '../components/cards/MetricCard'
import { OfferCard } from '../components/cards/OfferCard'
import { PickupCard } from '../components/cards/PickupCard'
import { CollectionPointMap } from '../components/maps/CollectionPointMap'
import { useOwnerApp } from '../hooks/useOwnerApp'
import { formatCurrency, formatKg } from '../utils/format'

export function Dashboard() {
  const app = useOwnerApp()
  const navigate = useNavigate()
  const activeBins = app.smartBins.filter((bin) => bin.status !== 'inactive')
  const manualLotKg = app.lots.reduce((total, lot) => total + lot.quantityKg, 0)
  const supportedStreams = activeBins.flatMap((bin) => bin.compartments).length
  const earnings = app.transactions.reduce((total, transaction) => total + transaction.amount, 0)
  const bestOffer = app.offers.sort((first, second) => second.price - first.price)[0]

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Friday, 17 July - Owner workspace</span>
          <h1>Good morning, {app.user.organization}</h1>
          <p>Your dashboard keeps smart bins available, publishes manual lot weights and coordinates smooth pickups.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/owner/bins')}>
            Manage bins
          </button>
          <button className="btn primary" type="button" onClick={() => navigate('/owner/offers')}>
            Review {app.offers.filter((offer) => offer.status === 'new').length} offers
          </button>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-badge">Priority action</span>
          <h2>Publish a plastic lot manually from one of your active smart bins.</h2>
          <p>
            Choose the supported plastic types, enter each weight yourself and compare current offers. The strongest offer is{' '}
            {formatCurrency(bestOffer?.price ?? 0)} with pickup available tomorrow morning.
          </p>
          <div className="hero-actions">
            <button className="btn light" type="button" onClick={() => app.openPublishModal()}>
              Publish lot
            </button>
            <button className="btn ghost" type="button" onClick={() => navigate('/owner/offers')}>
              Compare offers
            </button>
          </div>
          <div className="hero-proof">
            <div className="mini-avatars">
              <i>GN</i>
              <i>KR</i>
              <i>SL</i>
            </div>
            <span>
              <strong>3 verified collectors</strong> requested plastic from this point
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="owner-bin">
            <span className="lid"></span>
            <span className="body">
              <i className="label">PP</i>
              <i className="fill">
                <i></i>
              </i>
            </span>
          </div>
          <div className="floating f1">
            <strong>Manual kg</strong>
            <small>required to publish</small>
          </div>
          <div className="floating f2">
            <strong>{formatCurrency(bestOffer?.price ?? 0)}</strong>
            <small>best current offer</small>
          </div>
        </div>
      </section>

      <section className="metrics">
        <MetricCard tone="mint" icon="P" label="Manual lot weight" value={formatKg(manualLotKg)} detail="From owner-published lots" />
        <MetricCard tone="sun" icon="S" label="Supported streams" value={String(supportedStreams)} detail="Plastic types registered on active bins" />
        <MetricCard tone="violet" icon="$" label="Owner earnings" value={formatCurrency(earnings)} detail="Rs. 3,210 pending" />
        <MetricCard tone="coral" icon="B" label="Smart bin health" value={`${activeBins.length} / ${app.smartBins.length}`} detail="Active smart bins" />
      </section>

      <section className="grid-main">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Live supply</span>
              <h3>Plastic inventory by bin</h3>
            </div>
          </div>
          <div className="bin-grid">
            {app.smartBins.map((bin) => (
              <BinCard key={bin.id} bin={bin} onPublish={app.openPublishModal} />
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Incoming interest</span>
              <h3>Collector offers</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => navigate('/owner/offers')}>
              View all
            </button>
          </div>
          <div className="request-list">
            {app.offers.slice(0, 3).map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                lot={app.lots.find((lot) => lot.id === offer.lotId)}
                onAccept={app.openScheduleModal}
                onReject={app.rejectOffer}
              />
            ))}
          </div>
        </article>
      </section>

      <section className="grid-equal">
        <CollectionPointMap
          points={app.collectionPoints}
          bins={app.smartBins}
          selectedPointId={app.selectedPointId}
          onSelect={app.setSelectedPointId}
        />
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Pickup progress</span>
              <h3>Scheduled handovers</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => navigate('/owner/pickups')}>
              Schedule
            </button>
          </div>
          <div className="request-list">
            {app.pickups.map((pickup) => (
              <PickupCard key={pickup.id} pickup={pickup} onProgress={app.updatePickupProgress} />
            ))}
          </div>
        </article>
      </section>

      <section className="grid-equal">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Device health</span>
              <h3>Smart-bin alerts</h3>
            </div>
          </div>
          <div className="demand-list">
            {app.deviceAlerts.map((alert) => {
              const bin = app.smartBins.find((item) => item.id === alert.binId)
              return (
                <div className="demand" key={alert.id}>
                  <span className="demand-icon">{alert.severity === 'warning' ? '!' : 'i'}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{bin?.label ?? 'Smart bin'} - {alert.detail}</small>
                  </div>
                  <span className={`status ${alert.severity}`}>{alert.severity}</span>
                </div>
              )
            })}
          </div>
        </article>
        <article className="impact-card">
          <span className="eyebrow light">Positive community impact</span>
          <h3>Every published lot keeps plastic in the recovery loop.</h3>
          <p>Environmental stories live in the dedicated impact page while this dashboard stays action-focused.</p>
          <div className="impact-stats">
            {app.impactMetrics.slice(0, 2).map((metric) => (
              <span key={metric.id}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </span>
            ))}
          </div>
          <button className="btn light" type="button" onClick={() => navigate('/owner/impact')}>
            Explore impact
          </button>
        </article>
      </section>
    </div>
  )
}
