import { ownerSnapshot } from '../data/mockData'
import type { OwnerSnapshot } from '../types/domain'

export interface OwnerService {
  loadSnapshot: () => Promise<OwnerSnapshot>
}

const cloneSnapshot = (): OwnerSnapshot => ({
  user: { ...ownerSnapshot.user },
  collectionPoints: ownerSnapshot.collectionPoints.map((point) => ({
    ...point,
    coordinates: { ...point.coordinates },
  })),
  smartBins: ownerSnapshot.smartBins.map((bin) => ({
    ...bin,
    compartments: bin.compartments.map((compartment) => ({ ...compartment })),
  })),
  lots: ownerSnapshot.lots.map((lot) => ({ ...lot })),
  offers: ownerSnapshot.offers.map((offer) => ({ ...offer })),
  pickups: ownerSnapshot.pickups.map((pickup) => ({ ...pickup })),
  transactions: ownerSnapshot.transactions.map((transaction) => ({ ...transaction })),
  deviceAlerts: ownerSnapshot.deviceAlerts.map((alert) => ({ ...alert })),
  impactMetrics: ownerSnapshot.impactMetrics.map((metric) => ({ ...metric })),
  notifications: ownerSnapshot.notifications.map((notification) => ({ ...notification })),
  messages: ownerSnapshot.messages.map((message) => ({ ...message })),
})

export const ownerService: OwnerService = {
  loadSnapshot: () =>
    new Promise((resolve) => {
      window.setTimeout(() => resolve(cloneSnapshot()), 320)
    }),
}
