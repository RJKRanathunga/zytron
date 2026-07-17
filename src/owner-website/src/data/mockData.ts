import type {
  CollectorOffer,
  CollectionPoint,
  DeviceAlert,
  ImpactMetric,
  MessageThread,
  Notification,
  OwnerSnapshot,
  OwnerUser,
  Pickup,
  PlasticLot,
  SmartBin,
  Transaction,
} from '../types/domain'

const user: OwnerUser = {
  id: 'owner-uom-hub',
  name: 'UoM Collection Hub',
  initials: 'UM',
  organization: 'UoM Collection Hub',
  subtitle: 'Verified dustbin owner',
  email: 'sustainability@uom.lk',
  phone: '+94 11 265 0301',
  collectionPointName: 'UoM Main Entrance',
  collectionPointAddress: 'Bandaranayake Mawatha, Moratuwa',
}

const collectionPoints: CollectionPoint[] = [
  {
    id: 'point-main',
    name: 'UoM Main Entrance',
    address: 'Bandaranayake Mawatha, Moratuwa',
    district: 'Moratuwa',
    accessWindow: '8:00 AM-5:00 PM',
    coordinates: { x: 38, y: 36 },
  },
  {
    id: 'point-canteen',
    name: 'Engineering Canteen',
    address: 'Faculty canteen service lane',
    district: 'Moratuwa',
    accessWindow: '9:00 AM-3:00 PM',
    coordinates: { x: 62, y: 52 },
  },
]

const smartBins: SmartBin[] = [
  {
    id: 'bin-a-03',
    label: 'Smart Bin A-03',
    location: 'Main entrance',
    collectionPointId: 'point-main',
    status: 'online',
    batteryPercent: 88,
    lastSync: 'Now',
    cameraStatus: 'Online',
    weightSensorStatus: 'Online',
    compartments: [
      {
        id: 'comp-a03-pp',
        material: 'PP',
        quantityKg: 28.4,
        fillLevel: 91,
        thresholdLevel: 80,
        status: 'ready',
      },
    ],
  },
  {
    id: 'bin-a-01',
    label: 'Smart Bin A-01',
    location: 'Main entrance',
    collectionPointId: 'point-main',
    status: 'online',
    batteryPercent: 72,
    lastSync: '1 min ago',
    cameraStatus: 'Online',
    weightSensorStatus: 'Online',
    compartments: [
      {
        id: 'comp-a01-pet',
        material: 'PET',
        quantityKg: 17.8,
        fillLevel: 63,
        thresholdLevel: 80,
        status: 'growing',
      },
    ],
  },
  {
    id: 'bin-a-02',
    label: 'Smart Bin A-02',
    location: 'Canteen',
    collectionPointId: 'point-canteen',
    status: 'warning',
    batteryPercent: 64,
    lastSync: '4 min ago',
    cameraStatus: 'Online',
    weightSensorStatus: 'Check soon',
    compartments: [
      {
        id: 'comp-a02-hdpe',
        material: 'HDPE',
        quantityKg: 8.2,
        fillLevel: 31,
        thresholdLevel: 80,
        status: 'growing',
      },
    ],
  },
  {
    id: 'bin-b-01',
    label: 'Smart Bin B-01',
    location: 'Department block',
    collectionPointId: 'point-main',
    status: 'online',
    batteryPercent: 93,
    lastSync: '2 min ago',
    cameraStatus: 'Online',
    weightSensorStatus: 'Online',
    compartments: [
      {
        id: 'comp-b01-pp',
        material: 'PP',
        quantityKg: 17.8,
        fillLevel: 74,
        thresholdLevel: 80,
        status: 'reserved',
      },
    ],
  },
]

const lots: PlasticLot[] = [
  {
    id: 'lot-uom-pp',
    material: 'PP',
    binId: 'bin-a-03',
    quantityKg: 28.4,
    pricePerKg: 105,
    status: 'published',
    pickupWindow: 'Sat 18 Jul, 9:00 AM-12:00 PM',
    publishedAt: 'Today, 8:20 AM',
    views: 18,
  },
  {
    id: 'lot-uom-pp-reserved',
    material: 'PP',
    binId: 'bin-b-01',
    quantityKg: 17.8,
    pricePerKg: 102,
    status: 'reserved',
    pickupWindow: 'Fri 17 Jul, 3:00 PM-4:30 PM',
    publishedAt: 'Thu 16 Jul',
    views: 11,
  },
]

const offers: CollectorOffer[] = [
  {
    id: 'offer-greennova',
    collectorName: 'GreenNova Recyclers',
    collectorInitials: 'GN',
    lotId: 'lot-uom-pp',
    price: 3210,
    pickupWindow: 'Sat 18 Jul, 9:00 AM-11:00 AM',
    rating: 4.9,
    completedPickups: 42,
    status: 'new',
  },
  {
    id: 'offer-katubedda',
    collectorName: 'Katubedda Reprocess',
    collectorInitials: 'KR',
    lotId: 'lot-uom-pp',
    price: 3080,
    pickupWindow: 'Sat 18 Jul, 1:00 PM-3:00 PM',
    rating: 4.7,
    completedPickups: 31,
    status: 'new',
  },
  {
    id: 'offer-secondlife',
    collectorName: 'SecondLife Plastics',
    collectorInitials: 'SL',
    lotId: 'lot-uom-pp',
    price: 2990,
    pickupWindow: 'Mon 20 Jul, 9:00 AM-11:00 AM',
    rating: 4.8,
    completedPickups: 65,
    status: 'new',
  },
]

const pickups: Pickup[] = [
  {
    id: 'pickup-greennova',
    lotId: 'lot-uom-pp-reserved',
    collectorName: 'GreenNova Recyclers',
    collectorInitials: 'GN',
    dateLabel: 'Fri 17 Jul',
    timeWindow: '3:00 PM-4:30 PM',
    status: 'scheduled',
    handoverCode: 'UM-GN-178',
    progressPercent: 45,
  },
  {
    id: 'pickup-july-complete',
    lotId: 'lot-uom-pp',
    collectorName: 'Katubedda Reprocess',
    collectorInitials: 'KR',
    dateLabel: 'Wed 15 Jul',
    timeWindow: '10:00 AM-11:00 AM',
    status: 'completed',
    handoverCode: 'UM-KR-265',
    progressPercent: 100,
  },
]

const transactions: Transaction[] = [
  {
    id: 'txn-pp-ready',
    title: 'PP lot pending payout',
    dateLabel: 'Sat 18 Jul',
    amount: 3210,
    status: 'pending',
    method: 'Wallet release after handover',
  },
  {
    id: 'txn-pp-complete',
    title: 'Completed PP pickup',
    dateLabel: 'Wed 15 Jul',
    amount: 2860,
    status: 'paid',
    method: 'Bank transfer',
  },
  {
    id: 'txn-pet-complete',
    title: 'PET pickup payout',
    dateLabel: 'Mon 13 Jul',
    amount: 2570,
    status: 'paid',
    method: 'Bank transfer',
  },
]

const deviceAlerts: DeviceAlert[] = [
  {
    id: 'alert-a02-weight',
    binId: 'bin-a-02',
    title: 'Weight sensor check suggested',
    severity: 'warning',
    detail: 'HDPE bin A-02 has a sensor drift warning after the last sync.',
  },
  {
    id: 'alert-a03-threshold',
    binId: 'bin-a-03',
    title: 'PP threshold reached',
    severity: 'info',
    detail: 'A-03 passed the publication threshold and is ready for offers.',
  },
]

const impactMetrics: ImpactMetric[] = [
  { id: 'items', label: 'Items redirected', value: '3,170', detail: 'Estimated items kept in the loop this month' },
  { id: 'plastic', label: 'Plastic captured', value: '126.8 kg', detail: 'Measured by smart-bin weight sensors' },
  { id: 'co2', label: 'CO2e avoided', value: '218 kg', detail: 'Modeled from material recovery factors' },
  { id: 'community', label: 'Campus rank', value: 'Top 12%', detail: 'Against comparable collection points' },
]

const notifications: Notification[] = [
  {
    id: 'note-offer',
    title: 'New collector offer',
    body: 'GreenNova offered Rs. 3,210 for the ready PP lot.',
    timeLabel: '6 min ago',
    read: false,
    tone: 'offer',
  },
  {
    id: 'note-bin',
    title: 'PP bin is ready',
    body: 'Smart Bin A-03 crossed the pickup threshold.',
    timeLabel: '24 min ago',
    read: false,
    tone: 'bin',
  },
  {
    id: 'note-pickup',
    title: 'Pickup reminder',
    body: 'GreenNova is scheduled at 3:00 PM today.',
    timeLabel: '1 hr ago',
    read: true,
    tone: 'pickup',
  },
]

const messages: MessageThread[] = [
  {
    id: 'thread-greennova',
    participant: 'GreenNova Recyclers',
    initials: 'GN',
    role: 'Collector',
    lastMessage: 'We can arrive between 3:00 PM and 4:00 PM.',
    timeLabel: '1 hr ago',
    unread: 1,
  },
  {
    id: 'thread-maintenance',
    participant: 'PolyLoop Device Support',
    initials: 'PS',
    role: 'Support',
    lastMessage: 'A-02 can be recalibrated during the next visit.',
    timeLabel: 'Yesterday',
    unread: 0,
  },
]

export const ownerSnapshot: OwnerSnapshot = {
  user,
  collectionPoints,
  smartBins,
  lots,
  offers,
  pickups,
  transactions,
  deviceAlerts,
  impactMetrics,
  notifications,
  messages,
}
