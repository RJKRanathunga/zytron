import type { PlasticMaterial } from '../../config/plasticMaterials'

export type { PlasticMaterial }

export type MaterialFilter = PlasticMaterial | 'All'

export type LotStatus = 'ready' | 'growing' | 'reserved' | 'sold'

export type PickupStatus = 'confirmed' | 'awaiting' | 'completed' | 'cancelled'

export type TransactionStatus = 'paid' | 'pending' | 'scheduled'

export type NotificationTone = 'supply' | 'route' | 'payment' | 'message'

export interface User {
  id: string
  name: string
  initials: string
  organization: string
  subtitle: string
  email: string
  phone: string
  baseLocation: string
  vehicleCapacityKg: number
}

export interface CollectionPoint {
  id: string
  name: string
  initials: string
  district: string
  address: string
  rating: number
  handovers: number
  monthlyKg: number
  reliabilityScore: number
  saved: boolean
  latitude: number
  longitude: number
  distanceKm?: number | null
  supportedMaterials: PlasticMaterial[]
  accessNote: string
}

export interface PlasticLot {
  id: string
  material: PlasticMaterial
  title: string
  collectionPointId: string
  quantityKg: number
  totalWeightKg: number
  weightUnit: 'kg'
  plasticItems: LotPlasticItem[]
  pricePerKg: number
  status: LotStatus
  fillLevel: number
  readinessLabel: string
  pickupWindow: string
  qualityGrade: string
  tags: string[]
  demandScore: number
  closesAt: string
}

export interface LotPlasticItem {
  id?: string
  plasticType: PlasticMaterial | 'Other'
  customPlasticType?: string | null
  weight: number
  weightUnit: 'kg'
}

export interface DemandAlert {
  id: string
  label: string
  material: MaterialFilter
  minimumKg: number
  radiusKm: number
  readyWindow: string
  maxPricePerKg?: number
  matches: number
}

export interface Pickup {
  id: string
  lotId: string
  pointName: string
  pointInitials: string
  material: PlasticMaterial
  quantityKg: number
  dateLabel: string
  timeWindow: string
  status: PickupStatus
  price: number
  distanceKm?: number | null
  qrCode: string
}

export interface RouteStop {
  lotId: string
  eta: string
}

export interface RoutePlan {
  id: string
  name: string
  dateLabel: string
  stops: RouteStop[]
  vehicleCapacityKg: number
}

export interface Transaction {
  id: string
  lotId: string
  title: string
  dateLabel: string
  amount: number
  status: TransactionStatus
  method: string
}

export interface Notification {
  id: string
  tone: NotificationTone
  title: string
  body: string
  timeLabel: string
  read: boolean
}

export interface MessageThread {
  id: string
  participant: string
  initials: string
  role: string
  lastMessage: string
  timeLabel: string
  unread: number
  online: boolean
}

export interface CollectorSnapshot {
  user: User
  points: CollectionPoint[]
  lots: PlasticLot[]
  demandAlerts: DemandAlert[]
  pickups: Pickup[]
  routePlan: RoutePlan
  transactions: Transaction[]
  notifications: Notification[]
  messages: MessageThread[]
}

export interface ToastMessage {
  title: string
  detail: string
}

export type CollectorSortMode = 'recommended' | 'distance' | 'price' | 'quantity'
