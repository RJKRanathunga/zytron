import { LotCard } from '../components/cards/LotCard'
import { RouteSummaryCard } from '../components/cards/RouteSummaryCard'
import { EmptyState } from '../components/common/EmptyState'
import { useCollectorApp } from '../hooks/useCollectorApp'
import { getPointForLot } from '../utils/format'

export function RoutesPage() {
  const app = useCollectorApp()
  const routeLots = app.routeLotIds
    .map((lotId) => app.lots.find((lot) => lot.id === lotId))
    .filter((lot): lot is NonNullable<typeof lot> => Boolean(lot))
  const suggestions = app.lots.filter((lot) => !app.routeLotIds.includes(lot.id)).slice(0, 4)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Route planning</span>
          <h1>Build a collection route that protects margin.</h1>
          <p>Add or remove lots and the route totals update immediately across capacity, distance and purchase value.</p>
        </div>
        <div className="heading-actions">
          <button className="btn primary" disabled={routeLots.length === 0} type="button" onClick={app.openRouteModal}>
            Save route
          </button>
        </div>
      </section>

      <section className="grid-main">
        {routeLots.length > 0 ? (
          <RouteSummaryCard
            lots={routeLots}
            points={app.points}
            capacityKg={app.user.vehicleCapacityKg}
            title="Current collector route"
            onSave={app.openRouteModal}
            onRemove={app.removeLotFromRoute}
          />
        ) : (
          <EmptyState
            title="Your route is empty"
            body="Add lots from the suggestions or marketplace to calculate route totals."
            actionLabel="Browse marketplace"
            onAction={() =>
              app.showToast({
                title: 'Marketplace tip',
                detail: 'Use Add route on any lot card to build this route.',
              })
            }
          />
        )}
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Add stops</span>
              <h3>Recommended route additions</h3>
            </div>
          </div>
          <div className="lots compact">
            {suggestions.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                point={getPointForLot(lot, app.points)}
                isInRoute={false}
                isReserved={app.pickups.some((pickup) => pickup.lotId === lot.id)}
                onReserve={app.openReserveModal}
                onRouteToggle={app.addLotToRoute}
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
