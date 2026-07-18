import type { Notification } from '../../types/domain'

interface NotificationMenuProps {
  notifications: Notification[]
  isOpen: boolean
  onToggle: () => void
  onRead: (id: string) => void
}

export function NotificationMenu({
  notifications,
  isOpen,
  onToggle,
  onRead,
}: NotificationMenuProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return (
    <div className="notification-shell">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${unreadCount} unread notifications`}
        className="icon-btn"
        type="button"
        onClick={onToggle}
      >
        N<span className="badge">{unreadCount}</span>
      </button>
      {isOpen ? (
        <div className="notification-menu" role="menu">
          <div className="notification-head">
            <strong>Notifications</strong>
            <small>{unreadCount} unread</small>
          </div>
          {notifications.map((notification) => (
            <button
              className={`notification-item ${notification.read ? 'read' : ''}`}
              key={notification.id}
              role="menuitem"
              type="button"
              onClick={() => onRead(notification.id)}
            >
              <span className={`notification-dot ${notification.tone}`}></span>
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.body}</small>
                <em>{notification.timeLabel}</em>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
