import { useState } from 'react'
import { MaterialBadge } from '../common/MaterialBadge'
import { Modal } from './Modal'
import type { PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg, getLotValue } from '../../utils/format'

interface CollectorModalsProps {
  reserveLot: PlasticLot | null
  routeLots: PlasticLot[]
  isRouteOpen: boolean
  onClose: () => void
  onReserve: (lotId: string, date: string, timeWindow: string) => void
  onSaveRoute: (date: string) => void
}

export function CollectorModals({
  reserveLot,
  routeLots,
  isRouteOpen,
  onClose,
  onReserve,
  onSaveRoute,
}: CollectorModalsProps) {
  const [reservationDate, setReservationDate] = useState('2026-07-18')
  const [reservationWindow, setReservationWindow] = useState('9:00 AM-11:00 AM')
  const [routeDate, setRouteDate] = useState('2026-07-18')

  const routeKg = routeLots.reduce((total, lot) => total + lot.quantityKg, 0)
  const routeValue = routeLots.reduce((total, lot) => total + getLotValue(lot), 0)

  return (
    <>
      <Modal
        title="Reserve collection lot"
        description="Send a pickup proposal to the collection-point owner. The lot is held while they review it."
        icon={reserveLot ? <MaterialBadge material={reserveLot.material} /> : null}
        isOpen={reserveLot !== null}
        onClose={onClose}
      >
        {reserveLot ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onReserve(reserveLot.id, reservationDate, reservationWindow)
            }}
          >
            <div className="summary-grid">
              <div>
                <small>Material</small>
                <strong>
                  {formatKg(reserveLot.quantityKg)} {reserveLot.material}
                </strong>
              </div>
              <div>
                <small>Estimated purchase</small>
                <strong>{formatCurrency(getLotValue(reserveLot))}</strong>
              </div>
            </div>
            <label className="field">
              <span>Proposed pickup date</span>
              <input
                min="2026-07-18"
                required
                type="date"
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Pickup time window</span>
              <select value={reservationWindow} onChange={(event) => setReservationWindow(event.target.value)}>
                <option>9:00 AM-11:00 AM</option>
                <option>11:00 AM-1:00 PM</option>
                <option>2:00 PM-4:00 PM</option>
              </select>
            </label>
            <button className="btn primary full" type="submit">
              Send reservation request
            </button>
          </form>
        ) : null}
      </Modal>
      <Modal
        title="Save optimized route"
        description="This route combines selected points while respecting their collection windows."
        icon={<span className="symbol route-symbol">R</span>}
        isOpen={isRouteOpen}
        onClose={onClose}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSaveRoute(routeDate)
          }}
        >
          <div className="summary-grid">
            <div>
              <small>Total material</small>
              <strong>{formatKg(routeKg)}</strong>
            </div>
            <div>
              <small>Route distance</small>
              <strong>Calculated by Google Routes</strong>
            </div>
            <div>
              <small>Purchase value</small>
              <strong>{formatCurrency(routeValue)}</strong>
            </div>
            <div>
              <small>Route stops</small>
              <strong>{routeLots.length}</strong>
            </div>
          </div>
          <label className="field">
            <span>Route date</span>
            <input
              min="2026-07-18"
              required
              type="date"
              value={routeDate}
              onChange={(event) => setRouteDate(event.target.value)}
            />
          </label>
          <button className="btn primary full" disabled={routeLots.length === 0} type="submit">
            Reserve lots and save route
          </button>
        </form>
      </Modal>
    </>
  )
}
