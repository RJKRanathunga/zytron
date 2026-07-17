import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { OwnerModals } from './components/modals/OwnerModals'
import { ownerService } from './services/ownerService'
import { BinDetails } from './pages/BinDetails'
import { BinsPage } from './pages/BinsPage'
import { CollectionPointsPage } from './pages/CollectionPointsPage'
import { Dashboard } from './pages/Dashboard'
import { EarningsPage } from './pages/EarningsPage'
import { ImpactPage } from './pages/ImpactPage'
import { LotsPage } from './pages/LotsPage'
import { MessagesPage } from './pages/MessagesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OffersPage } from './pages/OffersPage'
import { PickupDetails } from './pages/PickupDetails'
import { PickupsPage } from './pages/PickupsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { OwnerAppContext } from './hooks/useOwnerApp'
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
} from './types/domain'
import { formatKg, getReadyCompartments } from './utils/format'
import './styles/app.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [user, setUser] = useState<OwnerUser | null>(null)
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([])
  const [smartBins, setSmartBins] = useState<SmartBin[]>([])
  const [lots, setLots] = useState<PlasticLot[]>([])
  const [offers, setOffers] = useState<CollectorOffer[]>([])
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deviceAlerts, setDeviceAlerts] = useState<DeviceAlert[]>([])
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetric[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messages, setMessages] = useState<MessageThread[]>([])
  const [activeMaterial, setActiveMaterial] = useLocalStorage<MaterialFilter>('owner-active-material', 'All')
  const [selectedPointId, setSelectedPointId] = useLocalStorage('owner-selected-point', 'point-main')
  const [sortMode, setSortMode] = useLocalStorage<OwnerSortMode>('owner-sort-mode', 'readiness')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isNotificationsOpen, setNotificationsOpen] = useState(false)
  const [publishBinId, setPublishBinId] = useState<string | null>(null)
  const [isPublishOpen, setPublishOpen] = useState(false)
  const [scheduleOfferId, setScheduleOfferId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    ownerService
      .loadSnapshot()
      .then((snapshot) => {
        if (!isMounted) return
        setUser(snapshot.user)
        setCollectionPoints(snapshot.collectionPoints)
        setSmartBins(snapshot.smartBins)
        setLots(snapshot.lots)
        setOffers(snapshot.offers)
        setPickups(snapshot.pickups)
        setTransactions(snapshot.transactions)
        setDeviceAlerts(snapshot.deviceAlerts)
        setImpactMetrics(snapshot.impactMetrics)
        setNotifications(snapshot.notifications)
        setMessages(snapshot.messages)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setLoadError('Owner data could not be loaded.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message: ToastMessage) => setToast(message)

  const openPublishModal = (binId?: string) => {
    const fallbackBin = getReadyCompartments(smartBins)[0]?.bin
    const selectedBin = binId ? smartBins.find((bin) => bin.id === binId) : fallbackBin
    if (!selectedBin) {
      showToast({ title: 'No ready plastic', detail: 'No bin compartment has crossed its publication threshold.' })
      return
    }
    setPublishBinId(selectedBin.id)
    setPublishOpen(true)
  }

  const publishLot = (binId: string, pricePerKg: number, pickupWindow: string) => {
    const bin = smartBins.find((item) => item.id === binId)
    const compartment = bin?.compartments.find(
      (item) => item.status === 'ready' || item.fillLevel >= item.thresholdLevel,
    )
    if (!bin || !compartment || Number.isNaN(pricePerKg) || pricePerKg <= 0) return

    const lot: PlasticLot = {
      id: `lot-${bin.id}-${Date.now()}`,
      material: compartment.material,
      binId: bin.id,
      quantityKg: compartment.quantityKg,
      pricePerKg,
      status: 'published',
      pickupWindow,
      publishedAt: 'Just now',
      views: 0,
    }
    setLots([lot, ...lots])
    setPublishOpen(false)
    setPublishBinId(null)
    showToast({
      title: 'Plastic lot published',
      detail: `${formatKg(lot.quantityKg)} ${lot.material} is now visible to collectors.`,
    })
  }

  const withdrawLot = (lotId: string) => {
    const lot = lots.find((item) => item.id === lotId)
    setLots(lots.map((item) => (item.id === lotId ? { ...item, status: 'withdrawn' } : item)))
    showToast({
      title: 'Lot withdrawn',
      detail: `${lot ? `${formatKg(lot.quantityKg)} ${lot.material}` : 'Selected lot'} is no longer visible.`,
    })
  }

  const openScheduleModal = (offerId: string) => {
    setScheduleOfferId(offerId)
  }

  const acceptOffer = (offerId: string, pickupDate: string, timeWindow: string) => {
    const offer = offers.find((item) => item.id === offerId)
    const lot = offer ? lots.find((item) => item.id === offer.lotId) : undefined
    if (!offer || !lot) return

    setOffers(offers.map((item) => (item.id === offerId ? { ...item, status: 'accepted' } : item)))
    setLots(lots.map((item) => (item.id === lot.id ? { ...item, status: 'reserved' } : item)))
    setPickups([
      {
        id: `pickup-${offer.id}-${Date.now()}`,
        lotId: lot.id,
        collectorName: offer.collectorName,
        collectorInitials: offer.collectorInitials,
        dateLabel: pickupDate,
        timeWindow,
        status: 'scheduled',
        handoverCode: `UM-${offer.collectorInitials}-${Math.round(lot.quantityKg * 10)}`,
        progressPercent: 10,
      },
      ...pickups,
    ])
    setTransactions([
      {
        id: `txn-${offer.id}-${Date.now()}`,
        title: `${offer.collectorName} accepted offer`,
        dateLabel: pickupDate,
        amount: offer.price,
        status: 'scheduled',
        method: 'Wallet release after handover',
      },
      ...transactions,
    ])
    setScheduleOfferId(null)
    showToast({
      title: 'Offer accepted',
      detail: `${offer.collectorName} is scheduled for ${pickupDate}, ${timeWindow}.`,
    })
  }

  const rejectOffer = (offerId: string) => {
    const offer = offers.find((item) => item.id === offerId)
    setOffers(offers.map((item) => (item.id === offerId ? { ...item, status: 'rejected' } : item)))
    showToast({
      title: 'Offer rejected',
      detail: `${offer?.collectorName ?? 'The collector'} will see that this offer was declined.`,
    })
  }

  const updatePickupProgress = (pickupId: string) => {
    const pickup = pickups.find((item) => item.id === pickupId)
    setPickups(
      pickups.map((item) => {
        if (item.id !== pickupId) return item
        const nextProgress = Math.min(100, item.progressPercent + 25)
        return {
          ...item,
          progressPercent: nextProgress,
          status: nextProgress >= 100 ? 'completed' : 'in-progress',
        }
      }),
    )
    showToast({
      title: 'Pickup progress updated',
      detail: `${pickup?.collectorName ?? 'Collector'} progress has been refreshed.`,
    })
  }

  const sendMessage = (threadId: string, message: string) => {
    setMessages(
      messages.map((thread) =>
        thread.id === threadId ? { ...thread, lastMessage: message, timeLabel: 'Just now', unread: 0 } : thread,
      ),
    )
    showToast({ title: 'Message sent', detail: 'The owner conversation has been updated.' })
  }

  const markNotificationRead = (id: string) => {
    const notification = notifications.find((item) => item.id === id)
    setNotifications(notifications.map((item) => (item.id === id ? { ...item, read: true } : item)))
    showToast({
      title: notification?.title ?? 'Notification opened',
      detail: notification?.body ?? 'Notification marked as read.',
    })
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Loading owner workspace</h1>
        <p>Preparing mock bins, offers and pickups.</p>
      </main>
    )
  }

  if (loadError || !user) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Owner workspace unavailable</h1>
        <p>{loadError || 'The workspace user could not be loaded.'}</p>
        <button className="btn primary" type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    )
  }

  const context: OwnerAppContext = {
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
    activeMaterial,
    selectedPointId,
    sortMode,
    searchQuery,
    isNotificationsOpen,
    setActiveMaterial,
    setSelectedPointId,
    setSortMode,
    setSearchQuery,
    setNotificationsOpen,
    markNotificationRead,
    openPublishModal,
    openScheduleModal,
    publishLot,
    withdrawLot,
    acceptOffer,
    rejectOffer,
    updatePickupProgress,
    sendMessage,
    showToast,
  }

  const publishBin = smartBins.find((bin) => bin.id === publishBinId) ?? null
  const scheduleOffer = offers.find((offer) => offer.id === scheduleOfferId) ?? null

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout context={context} toast={toast} />}>
          <Route index element={<Dashboard />} />
          <Route path="bins" element={<BinsPage />} />
          <Route path="bins/:binId" element={<BinDetails />} />
          <Route path="collection-points" element={<CollectionPointsPage />} />
          <Route path="lots" element={<LotsPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="pickups" element={<PickupsPage />} />
          <Route path="pickups/:pickupId" element={<PickupDetails />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="impact" element={<ImpactPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <OwnerModals
        publishBin={publishBin}
        scheduleOffer={scheduleOffer}
        lots={lots}
        isPublishOpen={isPublishOpen}
        onClose={() => {
          setPublishOpen(false)
          setPublishBinId(null)
          setScheduleOfferId(null)
        }}
        onPublish={publishLot}
        onSchedule={acceptOffer}
      />
    </BrowserRouter>
  )
}

export default App
