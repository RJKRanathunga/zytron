import { CollectionPointMap } from '../components/maps/CollectionPointMap'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function CollectionPointsPage() {
  const app = useOwnerApp()
  const selectedPoint = app.collectionPoints.find((point) => point.id === app.selectedPointId)
  const bins = app.smartBins.filter((bin) => bin.collectionPointId === app.selectedPointId)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Collection points</span>
          <h1>Manage pickup access and bin placement.</h1>
          <p>Select a collection point to view attached bins and access windows.</p>
        </div>
      </section>
      <section className="grid-main">
        <CollectionPointMap
          points={app.collectionPoints}
          bins={app.smartBins}
          selectedPointId={app.selectedPointId}
          onSelect={app.setSelectedPointId}
        />
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Selected point</span>
              <h3>{selectedPoint?.name ?? 'Collection point'}</h3>
            </div>
          </div>
          <div className="summary-grid">
            <div>
              <small>Address</small>
              <strong>{selectedPoint?.address ?? '-'}</strong>
            </div>
            <div>
              <small>Access</small>
              <strong>{selectedPoint?.accessWindow ?? '-'}</strong>
            </div>
            <div>
              <small>District</small>
              <strong>{selectedPoint?.district ?? '-'}</strong>
            </div>
            <div>
              <small>Smart bins</small>
              <strong>{bins.length}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
