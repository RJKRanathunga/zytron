import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { authService } from './authService'
import { AuthContext } from './AuthContext'
import { AUTH_CLEARED_EVENT } from '../services/apiClient'
import type { AuthUser } from '../types/auth'
import type { RegisterInput } from './AuthContext'
import type { UserRole } from '../types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(authService.configurationError)
  const activeAuthOperation = useRef(false)

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
      await authService.logout()
      setUser(null)
      setError(loadError instanceof Error ? loadError.message : 'Your session could not be restored.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(
    () =>
      authService.onFirebaseAuthStateChanged((firebaseUser) => {
        if (activeAuthOperation.current) {
          return
        }
        if (firebaseUser) {
          void reloadUser()
        } else {
          setUser(null)
          setLoading(false)
        }
      }),
    [reloadUser],
  )

  useEffect(() => {
    const handleAuthCleared = () => setUser(null)
    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    activeAuthOperation.current = true
    setError('')
    try {
      const authenticatedUser = await authService.login(email, password)
      setUser(authenticatedUser)
      return authenticatedUser
    } finally {
      activeAuthOperation.current = false
    }
  }, [])

  const loginWithGoogle = useCallback(async (role?: UserRole) => {
    activeAuthOperation.current = true
    setError('')
    try {
      const authenticatedUser = await authService.loginWithGoogle({ role })
      setUser(authenticatedUser)
      return authenticatedUser
    } finally {
      activeAuthOperation.current = false
    }
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    activeAuthOperation.current = true
    setError('')
    try {
      const authenticatedUser = await authService.register(input)
      setUser(authenticatedUser)
      return authenticatedUser
    } finally {
      activeAuthOperation.current = false
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError('')
    await authService.resetPassword(email)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, error, login, loginWithGoogle, register, resetPassword, logout, reloadUser }),
    [user, isLoading, error, login, loginWithGoogle, register, resetPassword, logout, reloadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
