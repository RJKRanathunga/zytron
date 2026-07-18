import { createContext, useContext } from 'react'
import type { AuthUser, UserRole } from '../types/auth'

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  role: UserRole
  phone?: string
}

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string
  login: (email: string, password: string) => Promise<AuthUser>
  loginWithGoogle: (role?: UserRole) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  resetPassword: (email: string) => Promise<void>
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
