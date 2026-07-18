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
  LotPlasticItem,
  SmartBin,
  PlasticMaterial,
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
  openEditLotModal: (lotId: string) => void
  openScheduleModal: (offerId: string) => void
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string, plasticItems: LotPlasticItem[]) => void
  updateLot: (lotId: string, pricePerKg: number, plasticItems: LotPlasticItem[]) => void
  createSmartBin: (input: SmartBinFormInput) => Promise<void>
  updateSmartBin: (binId: string, input: SmartBinFormInput) => Promise<void>
  removeSmartBin: (binId: string) => Promise<void>
  startListingPayment: (lotId: string) => void
  withdrawLot: (lotId: string) => void
  acceptOffer: (offerId: string, pickupDate: string, timeWindow: string) => void
  rejectOffer: (offerId: string) => void
  updatePickupProgress: (pickupId: string) => void
  sendMessage: (threadId: string, message: string) => void
  updateProfile: (input: { phone: string }) => void
  logout: () => void
  showToast: (message: ToastMessage) => void
}

export interface SmartBinFormInput {
  collectionPointId: string
  label: string
  deviceCode: string
  location: string
  model: string
  status: 'online' | 'warning' | 'offline' | 'inactive'
  supportedMaterials: PlasticMaterial[]
}

export function useOwnerApp() {
  return useOutletContext<OwnerAppContext>()
}
