import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
import { formatCurrency, formatKg, getLotValue, getPointForLot } from './utils/format'
import './styles/app.css'

function App() {
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
  const [routeLotIds, setRouteLotIds] = useLocalStorage<string[]>('collector-route-lot-ids', [
    'lot-uom-pp',
    'lot-kesbewa-pp',
    'lot-piliyandala-pp',
  ])
  const [savedPointIds, setSavedPointIds] = useLocalStorage<string[]>('collector-saved-point-ids', [
    'point-uom',
    'point-katubedda',
    'point-kesbewa',
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [reserveLotId, setReserveLotId] = useState<string | null>(null)
  const [isRouteModalOpen, setRouteModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isNotificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    collectorService
      .loadSnapshot()
      .then((snapshot) => {
        if (!isMounted) return
        setUser(snapshot.user)
        setLots(snapshot.lots)
        setPoints(snapshot.points)
        setPickups(snapshot.pickups)
        setDemandAlerts(snapshot.demandAlerts)
        setTransactions(snapshot.transactions)
        setNotifications(snapshot.notifications)
        setMessages(snapshot.messages)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setLoadError('Collector data could not be loaded.')
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
    const point = lot ? getPointForLot(lot, points) : undefined
    if (!lot) return

    const pickup: Pickup = {
      id: `pickup-${lot.id}-${Date.now()}`,
      lotId: lot.id,
      pointName: point?.name ?? 'Collection point',
      pointInitials: point?.initials ?? 'CP',
      material: lot.material,
      quantityKg: lot.quantityKg,
      dateLabel: date,
      timeWindow,
      status: 'awaiting',
      price: getLotValue(lot),
      distanceKm: point?.distanceKm ?? 0,
      qrCode: `${user?.initials ?? 'GN'}-${point?.initials ?? 'CP'}-${lot.material}-${Math.round(lot.quantityKg * 10)}`,
    }

    setPickups([pickup, ...pickups])
    setLots(lots.map((item) => (item.id === lotId ? { ...item, status: 'reserved', readinessLabel: 'Reserved' } : item)))
    setReserveLotId(null)
    showToast({
      title: 'Reservation request sent',
      detail: `${formatKg(lot.quantityKg)} ${lot.material} is awaiting owner confirmation.`,
    })
  }

  const saveRoute = (date: string) => {
    const routeLots = routeLotIds
      .map((lotId) => lots.find((lot) => lot.id === lotId))
      .filter((lot): lot is PlasticLot => Boolean(lot))
    setRouteModalOpen(false)
    showToast({
      title: 'Route saved',
      detail: `${routeLots.length} stops saved for ${date} with ${formatCurrency(
        routeLots.reduce((total, lot) => total + getLotValue(lot), 0),
      )} planned spend.`,
    })
  }

  const cancelPickup = (pickupId: string) => {
    const pickup = pickups.find((item) => item.id === pickupId)
    setPickups(pickups.map((item) => (item.id === pickupId ? { ...item, status: 'cancelled' } : item)))
    showToast({
      title: 'Pickup cancelled',
      detail: `${pickup?.pointName ?? 'The owner'} will see the updated reservation status.`,
    })
  }

  const toggleSavedPoint = (pointId: string) => {
    const point = points.find((item) => item.id === pointId)
    const isSaved = savedPointIds.includes(pointId)
    setSavedPointIds(isSaved ? savedPointIds.filter((item) => item !== pointId) : [...savedPointIds, pointId])
    showToast({
      title: isSaved ? 'Collection point removed' : 'Collection point saved',
      detail: `${point?.name ?? 'Selected point'} ${isSaved ? 'left' : 'joined'} your saved partner list.`,
    })
  }

  const createDemandAlert = (alert: Omit<DemandAlert, 'id' | 'matches'>) => {
    const matches = lots.filter((lot) => {
      const point = getPointForLot(lot, points)
      const materialMatch = alert.material === 'All' || lot.material === alert.material
      const priceMatch = alert.maxPricePerKg ? lot.pricePerKg <= alert.maxPricePerKg : true
      return materialMatch && lot.quantityKg >= alert.minimumKg && priceMatch && (point?.distanceKm ?? 99) <= alert.radiusKm
    }).length
    const nextAlert: DemandAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      matches,
    }
    setDemandAlerts([nextAlert, ...demandAlerts])
    showToast({
      title: 'Demand alert created',
      detail: `${nextAlert.label} is watching ${matches} matching lots.`,
    })
  }

  const sendMessage = (threadId: string, message: string) => {
    setMessages(
      messages.map((thread) =>
        thread.id === threadId ? { ...thread, lastMessage: message, timeLabel: 'Just now', unread: 0 } : thread,
      ),
    )
    showToast({ title: 'Message sent', detail: 'The pickup conversation has been updated.' })
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
        <h1>Loading collector workspace</h1>
        <p>Preparing mock supply, routes and reservations.</p>
      </main>
    )
  }

  if (loadError || !user) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Collector workspace unavailable</h1>
        <p>{loadError || 'The workspace user could not be loaded.'}</p>
        <button className="btn primary" type="button" onClick={() => window.location.reload()}>
          Reload
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
    showToast,
  }

  const reserveLot = lots.find((lot) => lot.id === reserveLotId) ?? null
  const routeLots = routeLotIds
    .map((lotId) => lots.find((lot) => lot.id === lotId))
    .filter((lot): lot is PlasticLot => Boolean(lot))

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout context={context} toast={toast} />}>
          <Route index element={<Dashboard />} />
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
        points={points}
        isRouteOpen={isRouteModalOpen}
        onClose={() => {
          setReserveLotId(null)
          setRouteModalOpen(false)
        }}
        onReserve={confirmReservation}
        onSaveRoute={saveRoute}
      />
    </BrowserRouter>
  )
}

export default App
