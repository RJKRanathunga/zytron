import { OfferCard } from '../components/cards/OfferCard'
import { EmptyState } from '../components/common/EmptyState'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function OffersPage() {
  const app = useOwnerApp()

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Collector offers</span>
          <h1>Review price, rating and pickup windows before accepting.</h1>
          <p>Accepting an offer opens scheduling details and marks competing offers as available for review.</p>
        </div>
      </section>
      <section className="panel">
        {app.offers.length > 0 ? (
          <div className="request-list">
            {app.offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                lot={app.lots.find((lot) => lot.id === offer.lotId)}
                onAccept={app.openScheduleModal}
                onReject={app.rejectOffer}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No collector offers" body="Collectors will appear here after a lot is published." />
        )}
      </section>
    </div>
  )
}
