import { NavLink } from 'react-router-dom'
import type { User } from '../../types/domain'

interface SidebarProps {
  user: User
  open: boolean
  marketplaceCount: number
  routeCount: number
  pickupCount: number
  unreadMessages: number
  onAction: (title: string, detail: string) => void
  onClose: () => void
}

const navGroups = [
  {
    label: 'Source plastic',
    items: [
      { to: '/collector/dashboard', icon: 'H', label: 'Overview', end: true },
      { to: '/collector/marketplace', icon: 'M', label: 'Find plastic', badge: 'marketplace' },
      { to: '/collector/demand-alerts', icon: 'D', label: 'Saved demand' },
      { to: '/collector/collection-points', icon: 'P', label: 'Collection points' },
      { to: '/collector/routes', icon: 'R', label: 'My route', badge: 'route' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/collector/pickups', icon: 'U', label: 'Reservations & pickups', badge: 'pickup' },
      { to: '/collector/transactions', icon: '$', label: 'Purchases & payments' },
      { to: '/collector/messages', icon: 'C', label: 'Messages', badge: 'messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/collector/profile', icon: 'I', label: 'Collector profile' },
      { to: '/collector/settings', icon: 'S', label: 'Settings' },
    ],
  },
]

export function Sidebar({
  user,
  open,
  marketplaceCount,
  routeCount,
  pickupCount,
  unreadMessages,
  onAction,
  onClose,
}: SidebarProps) {
  const getBadge = (badge?: string) => {
    if (badge === 'marketplace') return marketplaceCount
    if (badge === 'route') return routeCount
    if (badge === 'pickup') return pickupCount
    if (badge === 'messages') return unreadMessages
    return 0
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="collector-sidebar">
      <NavLink className="brand" to="/collector/dashboard" onClick={onClose}>
        <span className="brand-mark">PL</span>
        <span>
          <strong>PolyLoop</strong>
          <small>Collector workspace</small>
        </span>
      </NavLink>
      <nav className="nav" aria-label="Collector navigation">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((item) => {
              const count = getBadge(item.badge)
              return (
                <NavLink
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  end={item.end}
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {count > 0 ? <span className={item.badge === 'messages' ? 'pill coral' : 'pill'}>{count}</span> : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <section className="sidebar-card">
        <div className="icon">RT</div>
        <strong>Route opportunity</strong>
        <p>Three matching PP lots can form a 74 kg route within 18 km.</p>
        <button
          type="button"
          onClick={() => onAction('Optimized route opened', 'The PP route planner is ready for review.')}
        >
          Optimize this route
        </button>
      </section>
      <div className="profile">
        <span className="avatar">{user.initials}</span>
        <span>
          <strong>{user.organization}</strong>
          <small>{user.subtitle}</small>
        </span>
        <button
          aria-label="Open collector account menu"
          className="profile-menu"
          type="button"
          onClick={() => onAction('Account menu opened', 'Profile, settings and support are available.')}
        >
          ...
        </button>
      </div>
    </aside>
  )
}
