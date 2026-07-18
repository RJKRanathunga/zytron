import { useState } from 'react'
import { MaterialBadge } from '../common/MaterialBadge'
import { Modal } from './Modal'
import type { CollectorOffer, PlasticLot, SmartBin } from '../../types/domain'
import { formatCurrency, formatKg } from '../../utils/format'

interface OwnerModalsProps {
  publishBin: SmartBin | null
  scheduleOffer: CollectorOffer | null
  lots: PlasticLot[]
  isPublishOpen: boolean
  onClose: () => void
  onPublish: (binId: string, pricePerKg: number, pickupWindow: string) => void
  onSchedule: (offerId: string, pickupDate: string, timeWindow: string) => void
}

export function OwnerModals({
  publishBin,
  scheduleOffer,
  lots,
  isPublishOpen,
  onClose,
  onPublish,
  onSchedule,
}: OwnerModalsProps) {
  const [price, setPrice] = useState('105')
  const [publishWindow, setPublishWindow] = useState('Sat 18 Jul, 9:00 AM-12:00 PM')
  const [pickupDate, setPickupDate] = useState('2026-07-18')
  const [pickupWindow, setPickupWindow] = useState('9:00 AM-11:00 AM')

  const readyCompartment = publishBin?.compartments.find(
    (compartment) => compartment.status === 'ready' || compartment.fillLevel >= compartment.thresholdLevel,
  )
  const scheduleLot = scheduleOffer ? lots.find((lot) => lot.id === scheduleOffer.lotId) : undefined

  return (
    <>
      <Modal
        title="Publish plastic lot"
        description="Make ready material visible to verified collectors and begin receiving offers."
        icon={readyCompartment ? <MaterialBadge material={readyCompartment.material} /> : null}
        isOpen={isPublishOpen}
        onClose={onClose}
      >
        {publishBin && readyCompartment ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onPublish(publishBin.id, Number(price), publishWindow)
            }}
          >
            <div className="summary-grid">
              <div>
                <small>Available material</small>
                <strong>
                  {formatKg(readyCompartment.quantityKg)} {readyCompartment.material}
                </strong>
              </div>
              <div>
                <small>Smart bin</small>
                <strong>{publishBin.label}</strong>
              </div>
            </div>
            <label className="field">
              <span>Minimum price per kilogram</span>
              <input min="1" required type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
            <label className="field">
              <span>Preferred pickup window</span>
              <select value={publishWindow} onChange={(event) => setPublishWindow(event.target.value)}>
                <option>Sat 18 Jul, 9:00 AM-12:00 PM</option>
                <option>Sat 18 Jul, 1:00 PM-4:00 PM</option>
                <option>Any weekday, 8:00 AM-5:00 PM</option>
              </select>
            </label>
            <button className="btn primary full" type="submit">
              Publish to collector marketplace
            </button>
          </form>
        ) : (
          <p>No ready compartment is available in the selected bin.</p>
        )}
      </Modal>
      <Modal
        title="Schedule pickup"
        description="Confirm the collector offer and set the handover date and access window."
        icon={<span className="symbol route-symbol">U</span>}
        isOpen={scheduleOffer !== null}
        onClose={onClose}
      >
        {scheduleOffer ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSchedule(scheduleOffer.id, pickupDate, pickupWindow)
            }}
          >
            <div className="summary-grid">
              <div>
                <small>Collector</small>
                <strong>{scheduleOffer.collectorName}</strong>
              </div>
              <div>
                <small>Offer</small>
                <strong>{formatCurrency(scheduleOffer.price)}</strong>
              </div>
              <div>
                <small>Lot</small>
                <strong>{scheduleLot ? `${formatKg(scheduleLot.quantityKg)} ${scheduleLot.material}` : 'Plastic lot'}</strong>
              </div>
              <div>
                <small>Preferred window</small>
                <strong>{scheduleOffer.pickupWindow}</strong>
              </div>
            </div>
            <label className="field">
              <span>Pickup date</span>
              <input
                min="2026-07-18"
                required
                type="date"
                value={pickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Pickup time window</span>
              <select value={pickupWindow} onChange={(event) => setPickupWindow(event.target.value)}>
                <option>9:00 AM-11:00 AM</option>
                <option>11:00 AM-1:00 PM</option>
                <option>2:00 PM-4:00 PM</option>
              </select>
            </label>
            <button className="btn primary full" type="submit">
              Accept offer and schedule pickup
            </button>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
