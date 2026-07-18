import { useOutletContext } from 'react-router-dom'
import type {
  CollectorOffer,
  CollectionPoint,
  DeviceAlert,
  Dustbin,
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
  ToastMessage,
  Transaction,
} from '../types/domain'

export interface OwnerAppContext {
  user: OwnerUser
  collectionPoints: CollectionPoint[]
  smartBins: SmartBin[]
  dustbins: Dustbin[]
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
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string, plasticItems: LotPlasticItem[], dustbinId?: string) => void
  updateLot: (lotId: string, pricePerKg: number, plasticItems: LotPlasticItem[]) => void
  createDustbin: (input: DustbinFormInput) => Promise<void>
  updateDustbin: (dustbinId: string, input: DustbinFormInput) => Promise<void>
  deleteDustbin: (dustbinId: string) => Promise<void>
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

export interface DustbinFormInput {
  name: string
  code: string
  locationAddress: string
  latitude: number
  longitude: number
  supportedPlasticType: Dustbin['supportedPlasticType']
  description: string
  isActive: boolean
}

export function useOwnerApp() {
  return useOutletContext<OwnerAppContext>()
}
