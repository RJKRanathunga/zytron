import type { CollectionPoint, PlasticLot } from '../types/domain'
import { plasticMaterialLabel } from '../../config/plasticMaterials'

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} kg`

export const formatCurrency = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

export const getLotValue = (lot: PlasticLot) => Math.round(lot.quantityKg * lot.pricePerKg)

export const getPointForLot = (lot: PlasticLot, points: CollectionPoint[]) =>
  points.find((point) => point.id === lot.collectionPointId)

export const formatPlasticBreakdown = (lot: PlasticLot) =>
  lot.plasticItems
    .map((item) => `${plasticMaterialLabel(item.plasticType, item.customPlasticType)}: ${formatKg(item.weight)}`)
    .join(' / ')
