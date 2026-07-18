import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { CollectorModals } from './components/modals/CollectorModals'
import { collectorService } from './services/collectorService'
import { CollectionPointsPage } from './pages/CollectionPointsPage'
import { Dashboard } from './pages/Dashboard'
import { DemandAlertsPage } from './pages/DemandAlertsPage'
import { LotDetails } from './pages/LotDetails'
import { Marketplace } from './pages/Marketplace'
import { MessagesPage } from './pages/MessagesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PickupsPage } from './pages/PickupsPage'
import { ProfilePage } from './pages/ProfilePage'
import { RoutesPage } from './pages/RoutesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { CollectorAppContext } from './hooks/useCollectorApp'
import type {
  CollectionPoint,
  CollectorSnapshot,
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
} from './types/domain'

function App() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [lots, setLots] = useState<PlasticLot[]>([])
  const [points, setPoints] = useState<CollectionPoint[]>([])
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [demandAlerts, setDemandAlerts] = useState<DemandAlert[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messages, setMessages] = useState<MessageThread[]>([])
  const [activeMaterial, setActiveMaterial] = useLocalStorage<MaterialFilter>('collector-active-material', 'All')
  const [sortMode, setSortMode] = useLocalStorage<CollectorSortMode>('collector-sort-mode', 'recommended')
  const [routeLotIds, setRouteLotIds] = useState<string[]>([])
  const [savedPointIds, setSavedPointIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [reserveLotId, setReserveLotId] = useState<string | null>(null)
  const [isRouteModalOpen, setRouteModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isNotificationsOpen, setNotificationsOpen] = useState(false)

  const applySnapshot = useCallback((snapshot: CollectorSnapshot) => {
    setUser(snapshot.user)
    setLots(snapshot.lots)
    setPoints(snapshot.points)
    setPickups(snapshot.pickups)
    setDemandAlerts(snapshot.demandAlerts)
    setTransactions(snapshot.transactions)
    setNotifications(snapshot.notifications)
    setMessages(snapshot.messages)
    setRouteLotIds(snapshot.routePlan.stops.map((stop) => stop.lotId))
    setSavedPointIds(snapshot.points.filter((point) => point.saved).map((point) => point.id))
  }, [])

  useEffect(() => {
    let isMounted = true
    collectorService
      .loadSnapshot()
      .then((snapshot) => {
        if (!isMounted) return
        applySnapshot(snapshot)
        setIsLoading(false)
      })
      .catch((error) => {
        if (!isMounted) return
        setLoadError(error instanceof Error ? error.message : 'Collector data could not be loaded.')
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

  const mutate = async (operation: () => Promise<CollectorSnapshot>, success: ToastMessage) => {
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

  const addLotToRoute = (lotId: string) => {
    const lot = lots.find((item) => item.id === lotId)
    if (!lot) return
    if (routeLotIds.includes(lotId)) {
      showToast({ title: 'Lot is already in route', detail: `${lot.title} is already planned.` })
      return
    }
    setRouteLotIds([...routeLotIds, lotId])
    showToast({ title: 'Lot added to route', detail: `${lot.title} is now included in route totals.` })
  }

  const removeLotFromRoute = (lotId: string) => {
    const lot = lots.find((item) => item.id === lotId)
    setRouteLotIds(routeLotIds.filter((item) => item !== lotId))
    showToast({ title: 'Lot removed from route', detail: `${lot?.title ?? 'Selected lot'} was removed.` })
  }

  const confirmReservation = (lotId: string, date: string, timeWindow: string) => {
    const lot = lots.find((item) => item.id === lotId)
    if (!lot) return
    void mutate(() => collectorService.reserveLot(lotId, date, timeWindow), {
      title: 'Reservation request sent',
      detail: `${lot.title} is awaiting owner confirmation.`,
    })
    setReserveLotId(null)
  }

  const saveRoute = (date: string) => {
    void mutate(() => collectorService.saveRoute(routeLotIds, date), {
      title: 'Route saved',
      detail: `${routeLotIds.length} stops were saved for ${date}.`,
    })
    setRouteModalOpen(false)
  }

  const cancelPickup = (pickupId: string) => {
    const pickup = pickups.find((item) => item.id === pickupId)
    void mutate(() => collectorService.cancelPickup(pickupId), {
      title: 'Pickup cancelled',
      detail: `${pickup?.pointName ?? 'The owner'} will see the updated reservation status.`,
    })
  }

  const toggleSavedPoint = (pointId: string) => {
    const point = points.find((item) => item.id === pointId)
    const isSaved = savedPointIds.includes(pointId)
    void mutate(() => collectorService.toggleSavedPoint(pointId), {
      title: isSaved ? 'Collection point removed' : 'Collection point saved',
      detail: `${point?.name ?? 'Selected point'} ${isSaved ? 'left' : 'joined'} your saved partner list.`,
    })
  }

  const createDemandAlert = (alert: Omit<DemandAlert, 'id' | 'matches'>) => {
    void mutate(() => collectorService.createDemandAlert(alert), {
      title: 'Demand alert created',
      detail: `${alert.label} is watching for matching lots.`,
    })
  }

  const sendMessage = (threadId: string, message: string) => {
    void mutate(() => collectorService.sendMessage(threadId, message), {
      title: 'Message sent',
      detail: 'The pickup conversation has been updated.',
    })
  }

  const markNotificationRead = (id: string) => {
    const notification = notifications.find((item) => item.id === id)
    void mutate(() => collectorService.markNotificationRead(id), {
      title: notification?.title ?? 'Notification opened',
      detail: notification?.body ?? 'Notification marked as read.',
    })
  }

  const updateProfile = (input: { phone: string; baseLocation: string; vehicleCapacityKg: number }) => {
    void mutate(() => collectorService.updateProfile(input), {
      title: 'Profile details saved',
      detail: 'Your collector profile was updated in the API.',
    })
  }

  const logout = () => {
    void collectorService.logout().then(() => {
      setUser(null)
      setLots([])
      setPoints([])
      setPickups([])
      setDemandAlerts([])
      setTransactions([])
      setNotifications([])
      setMessages([])
      setRouteLotIds([])
      setSavedPointIds([])
      setLoadError('')
      navigate('/login', { replace: true })
    })
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Loading collector workspace</h1>
        <p>Syncing supply, routes and reservations from the API.</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Collector workspace unavailable</h1>
        <p>{loadError || 'Please sign in with a collector account to continue.'}</p>
        <button className="btn light" type="button" onClick={() => navigate('/login', { replace: true })}>
          Back to login
        </button>
      </main>
    )
  }

  const context: CollectorAppContext = {
    user,
    lots,
    points,
    pickups,
    demandAlerts,
    transactions,
    notifications,
    messages,
    routeLotIds,
    savedPointIds,
    activeMaterial,
    searchQuery,
    sortMode,
    isNotificationsOpen,
    setActiveMaterial,
    setSearchQuery,
    setSortMode,
    setNotificationsOpen,
    markNotificationRead,
    openReserveModal: setReserveLotId,
    openRouteModal: () => setRouteModalOpen(true),
    addLotToRoute,
    removeLotFromRoute,
    confirmReservation,
    saveRoute,
    cancelPickup,
    toggleSavedPoint,
    createDemandAlert,
    sendMessage,
    updateProfile,
    logout,
    showToast,
  }

  const reserveLot = lots.find((lot) => lot.id === reserveLotId) ?? null
  const routeLots = routeLotIds
    .map((lotId) => lots.find((lot) => lot.id === lotId))
    .filter((lot): lot is PlasticLot => Boolean(lot))

  return (
    <>
      <Routes>
        <Route element={<AppLayout context={context} toast={toast} />}>
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="marketplace/:lotId" element={<LotDetails />} />
          <Route path="demand-alerts" element={<DemandAlertsPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="pickups" element={<PickupsPage />} />
          <Route path="collection-points" element={<CollectionPointsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <CollectorModals
        reserveLot={reserveLot}
        routeLots={routeLots}
        isRouteOpen={isRouteModalOpen}
        onClose={() => {
          setReserveLotId(null)
          setRouteModalOpen(false)
        }}
        onReserve={confirmReservation}
        onSaveRoute={saveRoute}
      />
    </>
  )
}

export default App
