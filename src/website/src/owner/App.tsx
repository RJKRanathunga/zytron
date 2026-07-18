import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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
  OwnerSnapshot,
  OwnerSortMode,
  OwnerUser,
  Pickup,
  PlasticLot,
  SmartBin,
  ToastMessage,
  Transaction,
} from './types/domain'
import { formatKg, getReadyCompartments } from './utils/format'

function App() {
  const navigate = useNavigate()
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
  const [selectedPointId, setSelectedPointId] = useLocalStorage('owner-selected-point', 'point-uom')
  const [sortMode, setSortMode] = useLocalStorage<OwnerSortMode>('owner-sort-mode', 'readiness')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isNotificationsOpen, setNotificationsOpen] = useState(false)
  const [publishBinId, setPublishBinId] = useState<string | null>(null)
  const [isPublishOpen, setPublishOpen] = useState(false)
  const [scheduleOfferId, setScheduleOfferId] = useState<string | null>(null)

  const applySnapshot = useCallback((snapshot: OwnerSnapshot) => {
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
    if (!snapshot.collectionPoints.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(snapshot.collectionPoints[0]?.id ?? '')
    }
  }, [selectedPointId, setSelectedPointId])

  useEffect(() => {
    let isMounted = true
    ownerService
      .loadSnapshot()
      .then((snapshot) => {
        if (!isMounted) return
        applySnapshot(snapshot)
        setIsLoading(false)
      })
      .catch((error) => {
        if (!isMounted) return
        setLoadError(error instanceof Error ? error.message : 'Owner data could not be loaded.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [applySnapshot])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message: ToastMessage) => setToast(message)

  const mutate = async (operation: () => Promise<OwnerSnapshot>, success: ToastMessage) => {
    try {
      applySnapshot(await operation())
      showToast(success)
    } catch (error) {
      showToast({
        title: 'Action failed',
        detail: error instanceof Error ? error.message : 'The server could not complete the request.',
      })
    }
  }

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

    void mutate(() => ownerService.publishLot(binId, pricePerKg, pickupWindow), {
      title: 'Plastic lot published',
      detail: `${formatKg(compartment.quantityKg)} ${compartment.material} is now visible to collectors.`,
    })
    setPublishOpen(false)
    setPublishBinId(null)
  }

  const withdrawLot = (lotId: string) => {
    const lot = lots.find((item) => item.id === lotId)
    void mutate(() => ownerService.withdrawLot(lotId), {
      title: 'Lot withdrawn',
      detail: `${lot ? `${formatKg(lot.quantityKg)} ${lot.material}` : 'Selected lot'} is no longer visible.`,
    })
  }

  const openScheduleModal = (offerId: string) => {
    setScheduleOfferId(offerId)
  }

  const acceptOffer = (offerId: string, pickupDate: string, timeWindow: string) => {
    const offer = offers.find((item) => item.id === offerId)
    if (!offer) return
    void mutate(() => ownerService.acceptOffer(offerId, pickupDate, timeWindow), {
      title: 'Offer accepted',
      detail: `${offer.collectorName} is scheduled for ${pickupDate}, ${timeWindow}.`,
    })
    setScheduleOfferId(null)
  }

  const rejectOffer = (offerId: string) => {
    const offer = offers.find((item) => item.id === offerId)
    void mutate(() => ownerService.rejectOffer(offerId), {
      title: 'Offer rejected',
      detail: `${offer?.collectorName ?? 'The collector'} will see that this offer was declined.`,
    })
  }

  const updatePickupProgress = (pickupId: string) => {
    const pickup = pickups.find((item) => item.id === pickupId)
    void mutate(() => ownerService.updatePickupProgress(pickupId), {
      title: 'Pickup progress updated',
      detail: `${pickup?.collectorName ?? 'Collector'} progress has been refreshed.`,
    })
  }

  const sendMessage = (threadId: string, message: string) => {
    void mutate(() => ownerService.sendMessage(threadId, message), {
      title: 'Message sent',
      detail: 'The owner conversation has been updated.',
    })
  }

  const markNotificationRead = (id: string) => {
    const notification = notifications.find((item) => item.id === id)
    void mutate(() => ownerService.markNotificationRead(id), {
      title: notification?.title ?? 'Notification opened',
      detail: notification?.body ?? 'Notification marked as read.',
    })
  }

  const updateProfile = (input: { phone: string }) => {
    void mutate(() => ownerService.updateProfile(input), {
      title: 'Profile saved',
      detail: 'Your owner profile was updated in the API.',
    })
  }

  const logout = () => {
    void ownerService.logout().then(() => {
      setUser(null)
      setCollectionPoints([])
      setSmartBins([])
      setLots([])
      setOffers([])
      setPickups([])
      setTransactions([])
      setDeviceAlerts([])
      setImpactMetrics([])
      setNotifications([])
      setMessages([])
      setLoadError('')
      navigate('/login', { replace: true })
    })
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Loading owner workspace</h1>
        <p>Syncing bins, offers and pickups from the API.</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Owner workspace unavailable</h1>
        <p>{loadError || 'Please sign in with an owner account to continue.'}</p>
        <button className="btn light" type="button" onClick={() => navigate('/login', { replace: true })}>
          Back to login
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
    updateProfile,
    logout,
    showToast,
  }

  const publishBin = smartBins.find((bin) => bin.id === publishBinId) ?? null
  const scheduleOffer = offers.find((offer) => offer.id === scheduleOfferId) ?? null

  return (
    <>
      <Routes>
        <Route element={<AppLayout context={context} toast={toast} />}>
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
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
    </>
  )
}

export default App
