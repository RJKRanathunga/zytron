import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Toast } from '../common/Toast'
import { Sidebar } from '../navigation/Sidebar'
import { Topbar } from '../navigation/Topbar'
import type { OwnerAppContext } from '../../hooks/useOwnerApp'
import type { ToastMessage } from '../../types/domain'

interface AppLayoutProps {
  context: OwnerAppContext
  toast: ToastMessage | null
}

export function AppLayout({ context, toast }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const activeOffers = context.offers.filter((offer) => offer.status === 'new').length
  const activePickups = context.pickups.filter((pickup) => pickup.status !== 'completed').length
  const unreadMessages = context.messages.reduce((total, thread) => total + thread.unread, 0)

  return (
    <div className="owner app">
      <Sidebar
        user={context.user}
        open={mobileOpen}
        binCount={context.smartBins.length}
        offerCount={activeOffers}
        pickupCount={activePickups}
        unreadMessages={unreadMessages}
        onAction={(title, detail) => {
          context.showToast({ title, detail })
          navigate('/owner/impact')
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
          onPrimaryAction={() => context.openPublishModal()}
          onRoleSwitch={() =>
            context.showToast({
              title: 'Owner role active',
              detail: 'Collector pages require a collector account.',
            })
          }
        />
        <Outlet context={context} />
      </main>
      <Toast toast={toast} />
    </div>
  )
}
