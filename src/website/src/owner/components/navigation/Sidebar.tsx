import { NavLink } from 'react-router-dom'
import type { OwnerUser } from '../../types/domain'

interface SidebarProps {
  user: OwnerUser
  open: boolean
  binCount: number
  offerCount: number
  pickupCount: number
  unreadMessages: number
  onAction: (title: string, detail: string) => void
  onClose: () => void
}

const navGroups = [
  {
    label: 'Manage',
    items: [
      { to: '/owner/dashboard', icon: 'H', label: 'Overview', end: true },
      { to: '/owner/bins', icon: 'B', label: 'My smart bins', badge: 'bins' },
      { to: '/owner/collection-points', icon: 'P', label: 'Collection points' },
      { to: '/owner/lots', icon: 'L', label: 'Plastic lots' },
      { to: '/owner/pricing', icon: 'R', label: 'Pricing' },
      { to: '/owner/billing', icon: '$', label: 'Billing' },
      { to: '/owner/offers', icon: 'O', label: 'Collector offers', badge: 'offers' },
      { to: '/owner/pickups', icon: 'U', label: 'Scheduled pickups', badge: 'pickups' },
    ],
  },
  {
    label: 'Value',
    items: [
      { to: '/owner/earnings', icon: 'E', label: 'Earnings' },
      { to: '/owner/impact', icon: 'I', label: 'Impact & community' },
      { to: '/owner/messages', icon: 'C', label: 'Messages', badge: 'messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/owner/profile', icon: 'A', label: 'Owner profile' },
      { to: '/owner/settings', icon: 'S', label: 'Point settings' },
    ],
  },
]

export function Sidebar({
  user,
  open,
  binCount,
  offerCount,
  pickupCount,
  unreadMessages,
  onAction,
  onClose,
}: SidebarProps) {
  const getBadge = (badge?: string) => {
    if (badge === 'bins') return binCount
    if (badge === 'offers') return offerCount
    if (badge === 'pickups') return pickupCount
    if (badge === 'messages') return unreadMessages
    return 0
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="owner-sidebar">
      <NavLink className="brand" to="/owner/dashboard" onClick={onClose}>
        <span className="brand-mark">PL</span>
        <span>
          <strong>PolyLoop</strong>
          <small>Owner workspace</small>
        </span>
      </NavLink>
      <nav className="nav" aria-label="Owner navigation">
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
        <div className="icon">IM</div>
        <strong>Your point is in the top 12%</strong>
        <p>126.8 kg of plastic has been diverted this month.</p>
        <button type="button" onClick={() => onAction('Impact report opened', 'The impact page shows monthly outcomes.')}>
          View impact report
        </button>
      </section>
      <div className="profile">
        <span className="avatar">{user.initials}</span>
        <span>
          <strong>{user.organization}</strong>
          <small>{user.subtitle}</small>
        </span>
        <button
          aria-label="Open owner account menu"
          className="profile-menu"
          type="button"
          onClick={() => onAction('Account menu opened', 'Profile, point settings and support are available.')}
        >
          ...
        </button>
      </div>
    </aside>
  )
}
