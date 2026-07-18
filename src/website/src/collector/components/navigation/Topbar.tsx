import { NotificationMenu } from '../common/NotificationMenu'
import type { Notification } from '../../types/domain'

interface TopbarProps {
  searchQuery: string
  notifications: Notification[]
  isNotificationsOpen: boolean
  onMenu: () => void
  onSearch: (value: string) => void
  onNotificationToggle: () => void
  onNotificationRead: (id: string) => void
  onPrimaryAction: () => void
  onRoleSwitch: () => void
}

export function Topbar({
  searchQuery,
  notifications,
  isNotificationsOpen,
  onMenu,
  onSearch,
  onNotificationToggle,
  onNotificationRead,
  onPrimaryAction,
  onRoleSwitch,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button
        aria-controls="collector-sidebar"
        aria-label="Open navigation"
        className="mobile-menu"
        type="button"
        onClick={onMenu}
      >
        M
      </button>
      <label className="search">
        <span aria-hidden="true">Q</span>
        <input
          type="search"
          placeholder="Search material, point, district or route"
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
        />
        <kbd>/</kbd>
      </label>
      <div className="top-actions">
        <button className="role-link" type="button" onClick={onRoleSwitch}>
          <span>Role</span>
          <strong>Collector</strong>
        </button>
        <NotificationMenu
          notifications={notifications}
          isOpen={isNotificationsOpen}
          onToggle={onNotificationToggle}
          onRead={onNotificationRead}
        />
        <button className="btn primary" type="button" onClick={onPrimaryAction}>
          Find plastic
        </button>
      </div>
    </header>
  )
}
