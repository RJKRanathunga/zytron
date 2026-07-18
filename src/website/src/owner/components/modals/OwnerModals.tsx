import { useMemo, useState } from 'react'
import { MaterialBadge } from '../common/MaterialBadge'
import { Modal } from './Modal'
import type { CollectorOffer, LotPlasticItem, PlasticLot, PlasticMaterial, SmartBin } from '../../types/domain'
import { formatCurrency, formatKg } from '../../utils/format'
import { plasticMaterialLabel } from '../../../config/plasticMaterials'

interface OwnerModalsProps {
  publishBin: SmartBin | null
  scheduleOffer: CollectorOffer | null
  editLot: PlasticLot | null
  lots: PlasticLot[]
  isPublishOpen: boolean
  onClose: () => void
  onPublish: (binId: string, pricePerKg: number, pickupWindow: string, plasticItems: LotPlasticItem[]) => void
  onUpdateLot: (lotId: string, pricePerKg: number, plasticItems: LotPlasticItem[]) => void
  onSchedule: (offerId: string, pickupDate: string, timeWindow: string) => void
}

export function OwnerModals({
  publishBin,
  scheduleOffer,
  editLot,
  lots,
  isPublishOpen,
  onClose,
  onPublish,
  onUpdateLot,
  onSchedule,
}: OwnerModalsProps) {
  const [price, setPrice] = useState('105')
  const [publishWindow, setPublishWindow] = useState('Sat 18 Jul, 9:00 AM-12:00 PM')
  const [publishWeights, setPublishWeights] = useState<Record<string, string>>({})
  const [publishIncluded, setPublishIncluded] = useState<Record<string, boolean>>({})
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({})
  const [editPriceValues, setEditPriceValues] = useState<Record<string, string>>({})
  const [editWeightValues, setEditWeightValues] = useState<Record<string, string>>({})
  const [removedEditItems, setRemovedEditItems] = useState<string[]>([])
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [pickupDate, setPickupDate] = useState('2026-07-18')
  const [pickupWindow, setPickupWindow] = useState('9:00 AM-11:00 AM')

  const readyCompartments = useMemo(
    () =>
      publishBin?.compartments.filter(
        (compartment) => compartment.status === 'ready' || compartment.fillLevel >= compartment.thresholdLevel,
      ) ?? [],
    [publishBin],
  )
  const scheduleLot = scheduleOffer ? lots.find((lot) => lot.id === scheduleOffer.lotId) : undefined
  const publishKey = (material: PlasticMaterial) => `${publishBin?.id ?? 'bin'}:${material}`
  const publishTotal = readyCompartments.reduce((total, compartment) => {
    const key = publishKey(compartment.material)
    if (!(publishIncluded[key] ?? true)) return total
    const value = Number(publishWeights[key])
    return total + (Number.isFinite(value) && value > 0 ? value : 0)
  }, 0)
  const editItemKey = (lotId: string, item: LotPlasticItem, index: number) =>
    `${lotId}:${item.id ?? `${item.plasticType}-${index}`}`
  const editRows =
    editLot?.plasticItems
      .map((item, index) => {
        const itemKey = editItemKey(editLot.id, item, index)
        return {
          ...item,
          itemKey,
          weightInput: editWeightValues[itemKey] ?? String(item.weight),
        }
      })
      .filter((item) => !removedEditItems.includes(item.itemKey)) ?? []
  const currentEditPrice = editLot ? (editPriceValues[editLot.id] ?? String(editLot.pricePerKg)) : '105'
  const editTotal = editRows.reduce((total, row) => {
    const value = Number(row.weightInput)
    return total + (Number.isFinite(value) && value > 0 ? value : 0)
  }, 0)

  const validateManualItems = (
    items: Array<{ plasticType: PlasticMaterial | 'Other'; customPlasticType?: string | null; weightInput: string }>,
  ) => {
    const errors: Record<string, string> = {}
    const seen = new Set<string>()
    items.forEach((item) => {
      const value = Number(item.weightInput)
      const key = item.plasticType
      if (seen.has(key)) errors[key] = 'This plastic type is already included.'
      seen.add(key)
      if (!item.weightInput.trim()) errors[key] = 'Enter a weight.'
      else if (!Number.isFinite(value) || value <= 0) errors[key] = 'Weight must be greater than zero.'
      else if (!/^\d+(\.\d{1,2})?$/.test(item.weightInput.trim())) errors[key] = 'Use up to 2 decimals.'
    })
    if (items.length === 0) errors.form = 'Include at least one plastic type.'
    return errors
  }

  const publishItems = () =>
    readyCompartments
      .filter((compartment) => publishIncluded[publishKey(compartment.material)] ?? true)
      .map((compartment) => ({
        plasticType: compartment.material,
        weight: Number(publishWeights[publishKey(compartment.material)]),
        weightInput: publishWeights[publishKey(compartment.material)] ?? '',
        weightUnit: 'kg' as const,
      }))

  const editItems = () =>
    editRows.map((row) => ({
      plasticType: row.plasticType,
      customPlasticType: row.customPlasticType,
      weight: Number(row.weightInput),
      weightInput: row.weightInput,
      weightUnit: 'kg' as const,
    }))

  return (
    <>
      <Modal
        title="Publish plastic lot"
        description="Enter the seller-verified weight for each platform-detected plastic stream."
        icon={readyCompartments[0] ? <MaterialBadge material={readyCompartments[0].material} /> : null}
        isOpen={isPublishOpen}
        onClose={onClose}
      >
        {publishBin && readyCompartments.length > 0 ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const items = publishItems()
              const errors = validateManualItems(items)
              setPublishErrors(errors)
              if (Object.keys(errors).length > 0) return
              onPublish(
                publishBin.id,
                Number(price),
                publishWindow,
                items.map((item) => ({
                  plasticType: item.plasticType,
                  weight: item.weight,
                  weightUnit: item.weightUnit,
                })),
              )
            }}
          >
            <div className="summary-grid">
              <div>
                <small>Manual total</small>
                <strong>{formatKg(publishTotal)}</strong>
              </div>
              <div>
                <small>Smart bin</small>
                <strong>{publishBin.label}</strong>
              </div>
            </div>
            <div className="plastic-editor">
              {readyCompartments.map((compartment) => (
                <div className="plastic-row" key={compartment.id}>
                  <label className="check-line">
                    <input
                      checked={publishIncluded[publishKey(compartment.material)] ?? true}
                      type="checkbox"
                      onChange={(event) =>
                        setPublishIncluded({ ...publishIncluded, [publishKey(compartment.material)]: event.target.checked })
                      }
                    />
                    <MaterialBadge compact material={compartment.material} />
                    <span>{plasticMaterialLabel(compartment.material)}</span>
                  </label>
                  <label className="field compact-field">
                    <span>Weight</span>
                    <input
                      disabled={!(publishIncluded[publishKey(compartment.material)] ?? true)}
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="kg"
                      required={publishIncluded[publishKey(compartment.material)] ?? true}
                      type="number"
                      value={publishWeights[publishKey(compartment.material)] ?? ''}
                      onChange={(event) =>
                        setPublishWeights({ ...publishWeights, [publishKey(compartment.material)]: event.target.value })
                      }
                    />
                    {publishErrors[compartment.material] ? <small className="field-error">{publishErrors[compartment.material]}</small> : null}
                  </label>
                </div>
              ))}
              {publishErrors.form ? <small className="field-error">{publishErrors.form}</small> : null}
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
              Publish manual breakdown
            </button>
          </form>
        ) : (
          <p>No ready compartment is available in the selected bin.</p>
        )}
      </Modal>
      <Modal
        title="Edit lot weights"
        description="Update the seller-entered plastic breakdown. The total is recalculated from these kg values."
        icon={editLot ? <MaterialBadge material={editLot.material} /> : null}
        isOpen={editLot !== null}
        onClose={onClose}
      >
        {editLot ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const items = editItems()
              const errors = validateManualItems(items)
              setEditErrors(errors)
              if (Object.keys(errors).length > 0) return
              onUpdateLot(
                editLot.id,
                Number(currentEditPrice),
                items.map((item) => ({
                  plasticType: item.plasticType,
                  customPlasticType: item.customPlasticType,
                  weight: item.weight,
                  weightUnit: item.weightUnit,
                })),
              )
            }}
          >
            <div className="summary-grid">
              <div>
                <small>Manual total</small>
                <strong>{formatKg(editTotal)}</strong>
              </div>
              <div>
                <small>Lot</small>
                <strong>{editLot.title}</strong>
              </div>
            </div>
            <div className="plastic-editor">
              {editRows.map((row, index) => (
                <div className="plastic-row" key={`${row.plasticType}-${index}`}>
                  <div className="check-line">
                    {row.plasticType !== 'Other' ? <MaterialBadge compact material={row.plasticType} /> : null}
                    <span>{plasticMaterialLabel(row.plasticType, row.customPlasticType)}</span>
                  </div>
                  <label className="field compact-field">
                    <span>Weight</span>
                    <input
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      required
                      type="number"
                      value={row.weightInput}
                      onChange={(event) =>
                        setEditWeightValues({ ...editWeightValues, [row.itemKey]: event.target.value })
                      }
                    />
                    {editErrors[row.plasticType] ? <small className="field-error">{editErrors[row.plasticType]}</small> : null}
                  </label>
                  <button
                    className="mini-btn"
                    disabled={editRows.length === 1}
                    type="button"
                    onClick={() => setRemovedEditItems([...removedEditItems, row.itemKey])}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {editErrors.form ? <small className="field-error">{editErrors.form}</small> : null}
            </div>
            <label className="field">
              <span>Minimum price per kilogram</span>
              <input
                min="1"
                required
                type="number"
                value={currentEditPrice}
                onChange={(event) => setEditPriceValues({ ...editPriceValues, [editLot.id]: event.target.value })}
              />
            </label>
            <button className="btn primary full" type="submit">
              Save lot weights
            </button>
          </form>
        ) : null}
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
