import { useMemo } from 'react'
import { BinCard } from '../components/cards/BinCard'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useOwnerApp } from '../hooks/useOwnerApp'
import type { MaterialFilter } from '../types/domain'

const materialOptions: readonly MaterialFilter[] = ['All', 'PP', 'PET', 'HDPE', 'LDPE']

export function BinsPage() {
  const app = useOwnerApp()
  const bins = useMemo(() => {
    const normalizedQuery = app.searchQuery.trim().toLowerCase()
    return app.smartBins.filter((bin) => {
      const materialMatch =
        app.activeMaterial === 'All' || bin.compartments.some((compartment) => compartment.material === app.activeMaterial)
      const searchable = `${bin.label} ${bin.location} ${bin.status}`.toLowerCase()
      return materialMatch && (normalizedQuery.length === 0 || searchable.includes(normalizedQuery))
    })
  }, [app.activeMaterial, app.searchQuery, app.smartBins])

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Smart-bin inventory</span>
          <h1>Monitor fill levels, device status and publish-ready plastic.</h1>
          <p>Filter bins by material and open bin details for compartment, camera and sensor status.</p>
        </div>
        <SegmentedControl label="Bin material filter" options={materialOptions} value={app.activeMaterial} onChange={app.setActiveMaterial} />
      </section>
      <section className="bin-grid wide">
        {bins.map((bin) => (
          <BinCard key={bin.id} bin={bin} onPublish={app.openPublishModal} />
        ))}
      </section>
    </div>
  )
}
