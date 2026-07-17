import { useState } from 'react'
import { PickupCard } from '../components/cards/PickupCard'
import { EmptyState } from '../components/common/EmptyState'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useCollectorApp } from '../hooks/useCollectorApp'
import type { PickupStatus } from '../types/domain'

type PickupTab = 'upcoming' | 'completed' | 'cancelled'

const tabs: readonly PickupTab[] = ['upcoming', 'completed', 'cancelled']

export function PickupsPage() {
  const app = useCollectorApp()
  const [tab, setTab] = useState<PickupTab>('upcoming')

  const visiblePickups = app.pickups.filter((pickup) => {
    if (tab === 'upcoming') return pickup.status === 'confirmed' || pickup.status === 'awaiting'
    return pickup.status === (tab as PickupStatus)
  })

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Reservations and pickups</span>
          <h1>Track upcoming handovers and completed collections.</h1>
          <p>Open pickup QR references, message owners and cancel pending commitments when needed.</p>
        </div>
        <SegmentedControl label="Pickup status tabs" options={tabs} value={tab} onChange={setTab} />
      </section>

      <section className="panel">
        {visiblePickups.length > 0 ? (
          <div className="request-list">
            {visiblePickups.map((pickup) => (
              <PickupCard
                key={pickup.id}
                pickup={pickup}
                onOpen={() =>
                  app.showToast({
                    title: 'Pickup details opened',
                    detail: `${pickup.qrCode} includes directions, owner contact and handover checklist.`,
                  })
                }
                onCancel={app.cancelPickup}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`No ${tab} pickups`}
            body="The current pickup tab has no records. Reservations made from the marketplace will appear here."
          />
        )}
      </section>
    </div>
  )
}
