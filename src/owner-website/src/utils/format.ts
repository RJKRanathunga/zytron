import type { PlasticLot, SmartBin } from '../types/domain'

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} kg`

export const formatCurrency = (value: number) =>
  `Rs. ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

export const getLotValue = (lot: PlasticLot) => Math.round(lot.quantityKg * lot.pricePerKg)

export const getBinForLot = (lot: PlasticLot, bins: SmartBin[]) => bins.find((bin) => bin.id === lot.binId)

export const getReadyCompartments = (bins: SmartBin[]) =>
  bins.flatMap((bin) =>
    bin.compartments
      .filter((compartment) => compartment.fillLevel >= compartment.thresholdLevel || compartment.status === 'ready')
      .map((compartment) => ({ bin, compartment })),
  )

export const getBinTotalKg = (bin: SmartBin) =>
  bin.compartments.reduce((total, compartment) => total + compartment.quantityKg, 0)
