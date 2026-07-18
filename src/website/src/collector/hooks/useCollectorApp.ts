import { useOutletContext } from 'react-router-dom'
import type {
  CollectionPoint,
  CollectorSortMode,
  DemandAlert,
  MaterialFilter,
  MessageThread,
  Notification,
  Pickup,
  PlasticLot,
  ToastMessage,
  Transaction,
  User,
} from '../types/domain'

export interface CollectorAppContext {
  user: User
  lots: PlasticLot[]
  points: CollectionPoint[]
  pickups: Pickup[]
  demandAlerts: DemandAlert[]
  transactions: Transaction[]
  notifications: Notification[]
  messages: MessageThread[]
  routeLotIds: string[]
  savedPointIds: string[]
  activeMaterial: MaterialFilter
  searchQuery: string
  sortMode: CollectorSortMode
  isNotificationsOpen: boolean
  setActiveMaterial: (material: MaterialFilter) => void
  setSearchQuery: (query: string) => void
  setSortMode: (mode: CollectorSortMode) => void
  setNotificationsOpen: (isOpen: boolean) => void
  markNotificationRead: (id: string) => void
  openReserveModal: (lotId: string) => void
  openRouteModal: () => void
  addLotToRoute: (lotId: string) => void
  removeLotFromRoute: (lotId: string) => void
  confirmReservation: (lotId: string, date: string, timeWindow: string) => void
  saveRoute: (date: string) => void
  cancelPickup: (pickupId: string) => void
  toggleSavedPoint: (pointId: string) => void
  createDemandAlert: (alert: Omit<DemandAlert, 'id' | 'matches'>) => void
  sendMessage: (threadId: string, message: string) => void
  updateProfile: (input: { phone: string; baseLocation: string; vehicleCapacityKg: number }) => void
  logout: () => void
  showToast: (message: ToastMessage) => void
}

export function useCollectorApp() {
  return useOutletContext<CollectorAppContext>()
}
