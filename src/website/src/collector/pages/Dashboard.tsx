import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LotCard } from '../components/cards/LotCard'
import { MetricCard } from '../components/cards/MetricCard'
import { PartnerCard } from '../components/cards/PartnerCard'
import { PickupCard } from '../components/cards/PickupCard'
import { RouteSummaryCard } from '../components/cards/RouteSummaryCard'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { SupplyMap } from '../components/maps/SupplyMap'
import { useCollectorApp } from '../hooks/useCollectorApp'
import type { MaterialFilter } from '../types/domain'
import { formatCurrency, formatKg, getPointForLot, getRouteDistance } from '../utils/format'

const materialOptions: readonly MaterialFilter[] = ['PP', 'PET', 'HDPE']

export function Dashboard() {
  const app = useCollectorApp()
  const navigate = useNavigate()
  const [mapLotId, setMapLotId] = useState(app.lots[0]?.id)

  const routeLots = app.routeLotIds
    .map((lotId) => app.lots.find((lot) => lot.id === lotId))
    .filter((lot): lot is NonNullable<typeof lot> => Boolean(lot))

  const recommendedLots = useMemo(
    () =>
      app.lots
        .filter((lot) => lot.material === app.activeMaterial || app.activeMaterial === 'All')
        .sort((first, second) => second.demandScore - first.demandScore)
        .slice(0, 3),
    [app.activeMaterial, app.lots],
  )

  const matchingSupply = app.lots.reduce((total, lot) => total + lot.quantityKg, 0)
  const reservedKg = app.pickups
    .filter((pickup) => pickup.status === 'confirmed' || pickup.status === 'awaiting')
    .reduce((total, pickup) => total + pickup.quantityKg, 0)
  const reservedValue = app.pickups.reduce((total, pickup) => total + pickup.price, 0)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Friday, 17 July - Collector workspace</span>
          <h1>Good morning, {app.user.organization}</h1>
          <p>
            Your dashboard prioritizes material availability, purchasing opportunities, pickup commitments and route
            efficiency.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/collector/demand-alerts')}>
            Demand alerts
          </button>
          <button className="btn primary" type="button" onClick={() => navigate('/collector/marketplace')}>
            Browse {app.lots.length} lots
          </button>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-badge">Best collection opportunity</span>
          <h2>74 kg of matching PP is available across a compact 18 km route.</h2>
          <p>
            Three verified collection points match your active PP demand. Reserve the suggested route before the
            highest-value lots are booked.
          </p>
          <div className="hero-actions">
            <button className="btn light" type="button" onClick={app.openRouteModal}>
              Build this route
            </button>
            <button className="btn ghost" type="button" onClick={() => navigate('/collector/marketplace?material=PP')}>
              View matching lots
            </button>
          </div>
          <div className="hero-proof">
            <div className="mini-avatars">
              <i>UM</i>
              <i>KC</i>
              <i>PC</i>
            </div>
            <span>
              <strong>3 verified points</strong> - estimated purchase value {formatCurrency(7860)}
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="route-map">
            <i className="route-line"></i>
            <span className="map-pin p1">
              <span>28</span>
            </span>
            <span className="map-pin p2">
              <span>16</span>
            </span>
            <span className="map-pin p3">
              <span>30</span>
            </span>
            <span className="truck">TR</span>
          </div>
          <div className="floating f1">
            <strong>74 kg PP</strong>
            <small>3 collection stops</small>
          </div>
          <div className="floating f2">
            <strong>18 km</strong>
            <small>optimized distance</small>
          </div>
        </div>
      </section>

      <section className="metrics">
        <MetricCard tone="mint" icon="M" label="Matching supply nearby" value={formatKg(matchingSupply)} detail={`${app.lots.length} available lots`} />
        <MetricCard tone="sun" icon="P" label="Reserved for pickup" value={formatKg(reservedKg)} detail="3 active stops" />
        <MetricCard tone="blue" icon="R" label="Planned route" value={`${getRouteDistance(routeLots, app.points)} km`} detail="27% less travel" />
        <MetricCard tone="violet" icon="$" label="Estimated margin" value={formatCurrency(reservedValue)} detail="Across current reservations" />
      </section>

      <section className="grid-main">
        <SupplyMap
          lots={app.lots}
          points={app.points}
          routeLotIds={app.routeLotIds}
          selectedLotId={mapLotId}
          onSelectLot={setMapLotId}
          onAddToRoute={app.addLotToRoute}
        />
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recommended</span>
              <h3>Best lots for your demand</h3>
            </div>
            <SegmentedControl
              label="Recommended material filter"
              options={materialOptions}
              value={app.activeMaterial === 'All' ? 'PP' : app.activeMaterial}
              onChange={app.setActiveMaterial}
            />
          </div>
          <div className="lots">
            {recommendedLots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                point={getPointForLot(lot, app.points)}
                isInRoute={app.routeLotIds.includes(lot.id)}
                isReserved={app.pickups.some((pickup) => pickup.lotId === lot.id)}
                onReserve={app.openReserveModal}
                onRouteToggle={(lotId) =>
                  app.routeLotIds.includes(lotId) ? app.removeLotFromRoute(lotId) : app.addLotToRoute(lotId)
                }
              />
            ))}
          </div>
        </article>
      </section>

      <section className="grid-equal">
        <RouteSummaryCard
          lots={routeLots}
          points={app.points}
          capacityKg={app.user.vehicleCapacityKg}
          title="PP Route - Saturday AM"
          onSave={app.openRouteModal}
          onRemove={app.removeLotFromRoute}
        />
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Demand watch</span>
              <h3>Saved material alerts</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => navigate('/collector/demand-alerts')}>
              Manage alerts
            </button>
          </div>
          <div className="demand-list">
            {app.demandAlerts.map((alert) => (
              <div className="demand" key={alert.id}>
                <span className="demand-icon">{alert.material === 'All' ? 'A' : alert.material}</span>
                <div>
                  <strong>{alert.label}</strong>
                  <small>
                    Within {alert.radiusKm} km - {alert.readyWindow}
                  </small>
                </div>
                <span className="match">{alert.matches} matches</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid-equal">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Next handovers</span>
              <h3>Upcoming pickups</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => navigate('/collector/pickups')}>
              Full schedule
            </button>
          </div>
          <div className="request-list">
            {app.pickups
              .filter((pickup) => pickup.status !== 'completed')
              .slice(0, 3)
              .map((pickup) => (
                <PickupCard
                  key={pickup.id}
                  pickup={pickup}
                  onOpen={() =>
                    app.showToast({
                      title: 'Pickup opened',
                      detail: `${pickup.qrCode} is ready with route and handover details.`,
                    })
                  }
                />
              ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Reliable supply</span>
              <h3>Top collection-point partners</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => navigate('/collector/collection-points')}>
              View partners
            </button>
          </div>
          <div className="partner-list">
            {app.points.slice(0, 4).map((point) => (
              <PartnerCard
                key={point.id}
                point={point}
                isSaved={app.savedPointIds.includes(point.id)}
                onToggleSaved={app.toggleSavedPoint}
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
