import { collectorSnapshot } from '../data/mockData'
import type { CollectorSnapshot } from '../types/domain'

export interface CollectorService {
  loadSnapshot: () => Promise<CollectorSnapshot>
}

const cloneSnapshot = (): CollectorSnapshot => ({
  user: { ...collectorSnapshot.user },
  points: collectorSnapshot.points.map((point) => ({
    ...point,
    coordinates: { ...point.coordinates },
    supportedMaterials: [...point.supportedMaterials],
  })),
  lots: collectorSnapshot.lots.map((lot) => ({
    ...lot,
    tags: [...lot.tags],
  })),
  demandAlerts: collectorSnapshot.demandAlerts.map((alert) => ({ ...alert })),
  pickups: collectorSnapshot.pickups.map((pickup) => ({ ...pickup })),
  routePlan: {
    ...collectorSnapshot.routePlan,
    stops: collectorSnapshot.routePlan.stops.map((stop) => ({ ...stop })),
  },
  transactions: collectorSnapshot.transactions.map((transaction) => ({ ...transaction })),
  notifications: collectorSnapshot.notifications.map((notification) => ({ ...notification })),
  messages: collectorSnapshot.messages.map((message) => ({ ...message })),
})

export const collectorService: CollectorService = {
  loadSnapshot: () =>
    new Promise((resolve) => {
      window.setTimeout(() => resolve(cloneSnapshot()), 320)
    }),
}
