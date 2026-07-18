export type PlasticMaterial = 'PP' | 'PET' | 'HDPE' | 'LDPE'

export type MaterialFilter = PlasticMaterial | 'All'

export type BinStatus = 'online' | 'warning' | 'offline'

export type LotStatus = 'draft' | 'published' | 'reserved' | 'withdrawn'

export type OfferStatus = 'new' | 'accepted' | 'rejected'

export type PickupStatus = 'requested' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'

export type TransactionStatus = 'paid' | 'pending' | 'scheduled'

export interface OwnerUser {
  id: string
  name: string
  initials: string
  organization: string
  subtitle: string
  email: string
  phone: string
  collectionPointName: string
  collectionPointAddress: string
}

export interface CollectionPoint {
  id: string
  name: string
  address: string
  district: string
  accessWindow: string
  latitude: number
  longitude: number
}

export interface BinCompartment {
  id: string
  material: PlasticMaterial
  quantityKg: number
  fillLevel: number
  thresholdLevel: number
  status: 'ready' | 'growing' | 'reserved'
}

export interface SmartBin {
  id: string
  label: string
  location: string
  collectionPointId: string
  status: BinStatus
  batteryPercent: number
  lastSync: string
  cameraStatus: string
  weightSensorStatus: string
  compartments: BinCompartment[]
}

export interface PlasticLot {
  id: string
  material: PlasticMaterial
  binId: string
  quantityKg: number
  pricePerKg: number
  status: LotStatus
  pickupWindow: string
  publishedAt: string
  views: number
}

export interface CollectorOffer {
  id: string
  collectorName: string
  collectorInitials: string
  lotId: string
  price: number
  pickupWindow: string
  rating: number
  completedPickups: number
  status: OfferStatus
}

export interface Pickup {
  id: string
  lotId: string
  collectorName: string
  collectorInitials: string
  dateLabel: string
  timeWindow: string
  status: PickupStatus
  handoverCode: string
  progressPercent: number
}

export interface Transaction {
  id: string
  title: string
  dateLabel: string
  amount: number
  status: TransactionStatus
  method: string
}

export interface DeviceAlert {
  id: string
  binId: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  detail: string
}

export interface ImpactMetric {
  id: string
  label: string
  value: string
  detail: string
}

export interface Notification {
  id: string
  title: string
  body: string
  timeLabel: string
  read: boolean
  tone: 'bin' | 'offer' | 'pickup' | 'payment'
}

export interface MessageThread {
  id: string
  participant: string
  initials: string
  role: string
  lastMessage: string
  timeLabel: string
  unread: number
}

export interface OwnerSnapshot {
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
}

export interface ToastMessage {
  title: string
  detail: string
}

export type OwnerSortMode = 'readiness' | 'fill' | 'quantity' | 'status'
