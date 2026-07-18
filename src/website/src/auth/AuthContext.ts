import { createContext, useContext } from 'react'
import type { AuthUser } from '../types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  reloadUser: () => Promise<AuthUser | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
