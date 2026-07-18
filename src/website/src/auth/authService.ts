import { API_BASE_URL, apiRequest, clearAuthTokens, getAuthTokens, setAuthTokens, type AuthTokens } from '../services/apiClient'
import type { AuthUser, UserRole } from '../types/auth'
import { isUserRole } from '../types/auth'

interface AuthResponse extends AuthTokens {
  user: AuthUser
}

interface CurrentUserResponse {
  user: AuthUser
}

function requireValidRole(user: AuthUser): AuthUser {
  if (!isUserRole(user.role)) {
    clearAuthTokens()
    throw new Error('Your account does not have a valid role.')
  }
  return user
}

export function redirectPathForRole(role: AuthUser['role']) {
  return role === 'owner' ? '/owner/dashboard' : '/collector/dashboard'
}

export function redirectUserByRole(user: AuthUser) {
  return redirectPathForRole(user.role)
}

export async function getCurrentUser() {
  return authService.getCurrentUser()
}

export async function requireAuth() {
  const user = await authService.getCurrentUser()
  if (!user) {
    throw new Error('Authentication is required.')
  }
  return user
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error(`A ${role} account is required.`)
  }
  return user
}

export const authService = {
  hasSession: () => Boolean(getAuthTokens()),

  login: async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const user = requireValidRole(response.user)
    setAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken })
    return user
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiRequest<CurrentUserResponse>('/auth/me')
    return requireValidRole(response.user)
  },

  logout: async () => {
    const tokens = getAuthTokens()
    if (tokens) {
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.refreshToken}` },
      }).catch(() => undefined)
    }
    clearAuthTokens()
  },
}
