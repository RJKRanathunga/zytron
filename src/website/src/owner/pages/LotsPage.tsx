import { LotCard } from '../components/cards/LotCard'
import { EmptyState } from '../components/common/EmptyState'
import { useOwnerApp } from '../hooks/useOwnerApp'
import { getBinForLot } from '../utils/format'

export function LotsPage() {
  const app = useOwnerApp()

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Available plastic lots</span>
          <h1>Publish, edit or withdraw plastic visible to collectors.</h1>
          <p>Each lot keeps manually entered plastic weights. Smart bins only define the supported plastic types.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => app.openPublishModal()}>
          Publish lot
        </button>
      </section>
      {app.lots.length > 0 ? (
        <section className="lot-grid">
          {app.lots.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            bin={getBinForLot(lot, app.smartBins)}
            onEdit={app.openEditLotModal}
            onStartPayment={app.startListingPayment}
            onWithdraw={app.withdrawLot}
          />
          ))}
        </section>
      ) : (
        <EmptyState title="No lots published" body="Publish a manual plastic breakdown from a smart bin to receive collector offers." />
      )}
    </div>
  )
}
