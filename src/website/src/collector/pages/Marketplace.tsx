import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LotCard } from '../components/cards/LotCard'
import { EmptyState } from '../components/common/EmptyState'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useCollectorApp } from '../hooks/useCollectorApp'
import type { CollectorSortMode, MaterialFilter } from '../types/domain'
import { getLotValue, getPointForLot } from '../utils/format'

const materialOptions: readonly MaterialFilter[] = ['All', 'PP', 'PET', 'HDPE', 'LDPE']
const sortOptions: readonly CollectorSortMode[] = ['recommended', 'distance', 'price', 'quantity']

export function Marketplace() {
  const app = useCollectorApp()
  const [searchParams] = useSearchParams()
  const materialFromUrl = searchParams.get('material') as MaterialFilter | null
  const activeMaterial = materialFromUrl ?? app.activeMaterial

  const filteredLots = useMemo(() => {
    const normalizedQuery = app.searchQuery.trim().toLowerCase()

    return app.lots
      .filter((lot) => activeMaterial === 'All' || lot.material === activeMaterial)
      .filter((lot) => {
        const point = getPointForLot(lot, app.points)
        const searchable = `${lot.title} ${lot.material} ${point?.name ?? ''} ${point?.district ?? ''}`.toLowerCase()
        return normalizedQuery.length === 0 || searchable.includes(normalizedQuery)
      })
      .sort((first, second) => {
        if (app.sortMode === 'distance') {
          const firstPoint = getPointForLot(first, app.points)
          const secondPoint = getPointForLot(second, app.points)
          return (firstPoint?.distanceKm ?? Number.POSITIVE_INFINITY) - (secondPoint?.distanceKm ?? Number.POSITIVE_INFINITY)
        }
        if (app.sortMode === 'price') return first.pricePerKg - second.pricePerKg
        if (app.sortMode === 'quantity') return second.quantityKg - first.quantityKg
        return second.demandScore - first.demandScore
      })
  }, [activeMaterial, app.lots, app.points, app.searchQuery, app.sortMode])

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Supply marketplace</span>
          <h1>Find plastic lots that fit your route and demand.</h1>
          <p>Filter by material, compare pickup conditions and reserve verified supply from collection points nearby.</p>
        </div>
        <div className="heading-actions">
          <select
            aria-label="Sort lots"
            className="select-control"
            value={app.sortMode}
            onChange={(event) => app.setSortMode(event.target.value as CollectorSortMode)}
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                Sort: {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel toolbar-panel">
        <SegmentedControl
          label="Material filters"
          options={materialOptions}
          value={activeMaterial}
          onChange={app.setActiveMaterial}
        />
        <p>{filteredLots.length} lots match the current search.</p>
      </section>

      {filteredLots.length > 0 ? (
        <section className="lot-grid">
          {filteredLots.map((lot) => (
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
        </section>
      ) : (
        <EmptyState
          title="No lots match this filter"
          body="Try another material, clear the search box, or create a demand alert for the supply you want."
          actionLabel="Create demand alert"
          onAction={() =>
            app.showToast({
              title: 'Demand alert route opened',
              detail: 'Use the Saved demand page to create a new material alert.',
            })
          }
        />
      )}

      <section className="panel insight-strip">
        <strong>Marketplace summary</strong>
        <span>{filteredLots.reduce((total, lot) => total + lot.quantityKg, 0).toFixed(1)} kg visible</span>
        <span>{filteredLots.reduce((total, lot) => total + getLotValue(lot), 0).toLocaleString()} LKR estimated</span>
        <button className="btn secondary" type="button" onClick={app.openRouteModal}>
          Save current route
        </button>
      </section>
    </div>
  )
}
