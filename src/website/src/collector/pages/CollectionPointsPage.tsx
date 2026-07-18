import { useMemo, useState } from 'react'
import { PartnerCard } from '../components/cards/PartnerCard'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { SupplyMap } from '../components/maps/SupplyMap'
import { useCollectorApp } from '../hooks/useCollectorApp'

type PointFilter = 'all' | 'saved' | 'high-score'

const pointFilters: readonly PointFilter[] = ['all', 'saved', 'high-score']

export function CollectionPointsPage() {
  const app = useCollectorApp()
  const [filter, setFilter] = useState<PointFilter>('all')
  const [selectedLotId, setSelectedLotId] = useState(app.lots[0]?.id)

  const points = useMemo(() => {
    if (filter === 'saved') return app.points.filter((point) => app.savedPointIds.includes(point.id))
    if (filter === 'high-score') return app.points.filter((point) => point.reliabilityScore >= 94)
    return app.points
  }, [app.points, app.savedPointIds, filter])

  const pointIds = points.map((point) => point.id)
  const lots = app.lots.filter((lot) => pointIds.includes(lot.collectionPointId))

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Supplier partners</span>
          <h1>Save reliable collection points and inspect nearby supply.</h1>
          <p>Use saved points to focus recurring routes around owners with high handover reliability.</p>
        </div>
        <SegmentedControl label="Collection point filters" options={pointFilters} value={filter} onChange={setFilter} />
      </section>

      <section className="grid-main">
        <SupplyMap
          lots={lots}
          points={app.points}
          routeLotIds={app.routeLotIds}
          selectedLotId={selectedLotId}
          onSelectLot={setSelectedLotId}
          onAddToRoute={app.addLotToRoute}
        />
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Collection points</span>
              <h3>{points.length} visible partners</h3>
            </div>
          </div>
          <div className="partner-list">
            {points.map((point) => (
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
