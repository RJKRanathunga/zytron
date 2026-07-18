import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from './authService'
import { AuthContext } from './AuthContext'
import { AUTH_CLEARED_EVENT } from '../services/apiClient'
import type { AuthUser } from '../types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(() => authService.hasSession())
  const [error, setError] = useState('')

  const reloadUser = useCallback(async () => {
    if (!authService.hasSession()) {
      setUser(null)
      setLoading(false)
      return null
    }

    setLoading(true)
    setError('')
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (loadError) {
      setUser(null)
      setError(loadError instanceof Error ? loadError.message : 'Your session could not be restored.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadUser(), 0)
    return () => window.clearTimeout(timer)
  }, [reloadUser])

  useEffect(() => {
    const handleAuthCleared = () => setUser(null)
    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError('')
    const authenticatedUser = await authService.login(email, password)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, error, login, logout, reloadUser }),
    [user, isLoading, error, login, logout, reloadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
