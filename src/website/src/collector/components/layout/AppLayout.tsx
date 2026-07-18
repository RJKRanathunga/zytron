import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Toast } from '../common/Toast'
import { Sidebar } from '../navigation/Sidebar'
import { Topbar } from '../navigation/Topbar'
import type { CollectorAppContext } from '../../hooks/useCollectorApp'
import type { ToastMessage } from '../../types/domain'

interface AppLayoutProps {
  context: CollectorAppContext
  toast: ToastMessage | null
}

export function AppLayout({ context, toast }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const unreadMessages = context.messages.reduce((total, thread) => total + thread.unread, 0)
  const pickupCount = context.pickups.filter((pickup) => pickup.status !== 'completed').length

  return (
    <div className="collector app">
      <Sidebar
        user={context.user}
        open={mobileOpen}
        marketplaceCount={context.lots.filter((lot) => lot.status !== 'sold').length}
        routeCount={context.routeLotIds.length}
        pickupCount={pickupCount}
        unreadMessages={unreadMessages}
        onAction={(title, detail) => {
          context.showToast({ title, detail })
          navigate('/collector/routes')
        }}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="drawer-scrim"
          type="button"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <main className="main">
        <Topbar
          searchQuery={context.searchQuery}
          notifications={context.notifications}
          isNotificationsOpen={context.isNotificationsOpen}
          onMenu={() => setMobileOpen((value) => !value)}
          onSearch={context.setSearchQuery}
          onNotificationToggle={() => context.setNotificationsOpen(!context.isNotificationsOpen)}
          onNotificationRead={context.markNotificationRead}
          onPrimaryAction={() => navigate('/collector/marketplace')}
          onRoleSwitch={() =>
            context.showToast({
              title: 'Collector role active',
              detail: 'Owner pages require an owner account.',
            })
          }
        />
        <Outlet context={context} />
      </main>
      <Toast toast={toast} />
    </div>
  )
}
