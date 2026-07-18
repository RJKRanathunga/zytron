import type { PlasticLot, SmartBin } from '../types/domain'
import { plasticMaterialLabel } from '../../config/plasticMaterials'

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} kg`

export const formatCurrency = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

export const getLotValue = (lot: PlasticLot) => Math.round(lot.quantityKg * lot.pricePerKg)

export const formatPlasticBreakdown = (lot: PlasticLot) =>
  lot.plasticItems
    .map((item) => `${plasticMaterialLabel(item.plasticType, item.customPlasticType)}: ${formatKg(item.weight)}`)
    .join(' / ')

export const getBinForLot = (lot: PlasticLot, bins: SmartBin[]) => bins.find((bin) => bin.id === lot.binId)

export const getBinTotalKg = (bin: SmartBin) =>
  bin.compartments.reduce((total, compartment) => total + compartment.quantityKg, 0)
