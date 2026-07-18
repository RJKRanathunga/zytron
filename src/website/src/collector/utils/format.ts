import type { CollectionPoint, PlasticLot } from '../types/domain'

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} kg`

export const formatCurrency = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

export const getLotValue = (lot: PlasticLot) => Math.round(lot.quantityKg * lot.pricePerKg)

export const getPointForLot = (lot: PlasticLot, points: CollectionPoint[]) =>
  points.find((point) => point.id === lot.collectionPointId)

export const getRouteDistance = (lots: PlasticLot[], points: CollectionPoint[]) => {
  const stopDistance = lots.reduce((total, lot) => {
    const point = getPointForLot(lot, points)
    return total + (point?.distanceKm ?? 0)
  }, 0)

  return Math.round(stopDistance * 1.2)
}

export const getRouteDriveTime = (distanceKm: number) => {
  const minutes = Math.max(22, Math.round(distanceKm * 2.9))
  return `${minutes} min`
}
