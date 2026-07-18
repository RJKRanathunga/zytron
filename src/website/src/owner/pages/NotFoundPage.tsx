import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page">
      <section className="empty-state standalone">
        <span className="empty-icon">404</span>
        <h1>Route not found</h1>
        <p>The owner workspace does not have a page at this address.</p>
        <Link className="btn primary" to="/owner/dashboard">
          Return to dashboard
        </Link>
      </section>
    </div>
  )
}
