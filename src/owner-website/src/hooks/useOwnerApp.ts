import { useOutletContext } from 'react-router-dom'
import type {
  CollectorOffer,
  CollectionPoint,
  DeviceAlert,
  ImpactMetric,
  MaterialFilter,
  MessageThread,
  Notification,
  OwnerSortMode,
  OwnerUser,
  Pickup,
  PlasticLot,
  SmartBin,
  ToastMessage,
  Transaction,
} from '../types/domain'

export interface OwnerAppContext {
  user: OwnerUser
  collectionPoints: CollectionPoint[]
  smartBins: SmartBin[]
  lots: PlasticLot[]
  offers: CollectorOffer[]
  pickups: Pickup[]
  transactions: Transaction[]
  deviceAlerts: DeviceAlert[]
  impactMetrics: ImpactMetric[]
  notifications: Notification[]
  messages: MessageThread[]
  activeMaterial: MaterialFilter
  selectedPointId: string
  sortMode: OwnerSortMode
  searchQuery: string
  isNotificationsOpen: boolean
  setActiveMaterial: (material: MaterialFilter) => void
  setSelectedPointId: (pointId: string) => void
  setSortMode: (mode: OwnerSortMode) => void
  setSearchQuery: (query: string) => void
  setNotificationsOpen: (isOpen: boolean) => void
  markNotificationRead: (id: string) => void
  openPublishModal: (binId?: string) => void
  openScheduleModal: (offerId: string) => void
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string) => void
  withdrawLot: (lotId: string) => void
  acceptOffer: (offerId: string, pickupDate: string, timeWindow: string) => void
  rejectOffer: (offerId: string) => void
  updatePickupProgress: (pickupId: string) => void
  sendMessage: (threadId: string, message: string) => void
  showToast: (message: ToastMessage) => void
}

export function useOwnerApp() {
  return useOutletContext<OwnerAppContext>()
}
