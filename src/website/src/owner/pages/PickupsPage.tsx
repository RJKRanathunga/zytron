import { Link } from 'react-router-dom'
import { PickupCard } from '../components/cards/PickupCard'
import { EmptyState } from '../components/common/EmptyState'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function PickupsPage() {
  const app = useOwnerApp()

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Scheduled pickups</span>
          <h1>Track collection progress from request to handover.</h1>
          <p>Update pickup progress and open individual pickup details for access and handover codes.</p>
        </div>
      </section>
      <section className="panel">
        {app.pickups.length > 0 ? (
          <div className="request-list">
            {app.pickups.map((pickup) => (
              <div className="pickup-link-wrap" key={pickup.id}>
                <PickupCard pickup={pickup} onProgress={app.updatePickupProgress} />
                <Link className="text-btn" to={`/owner/pickups/${pickup.id}`}>
                  Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No scheduled pickups" body="Accepted offers will create pickup rows here." />
        )}
      </section>
    </div>
  )
}
