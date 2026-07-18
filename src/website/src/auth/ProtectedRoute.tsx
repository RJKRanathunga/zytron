import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { redirectUserByRole } from './authService'
import { useAuth } from './AuthContext'
import type { UserRole } from '../types/auth'

export function ProtectedRoute({ requiredRole }: { requiredRole: UserRole }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">PL</span>
        <h1>Checking your session</h1>
        <p>Verifying your account before opening the workspace.</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  if (user.role !== requiredRole) {
    return <Navigate replace to={redirectUserByRole(user)} />
  }

  return <Outlet />
}
