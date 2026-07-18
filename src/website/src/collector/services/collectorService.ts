import {
  ApiClientError,
  API_BASE_URL,
  apiRequest,
  clearAuthTokens,
  getAuthTokens,
  setAuthTokens,
  type AuthTokens,
} from '../../services/apiClient'
import type { CollectorSnapshot, DemandAlert } from '../types/domain'

interface AuthResponse extends AuthTokens {
  user: {
    role: string
  }
  snapshot?: CollectorSnapshot
}

export interface CollectorService {
  hasSession: () => boolean
  login: (email: string, password: string) => Promise<CollectorSnapshot>
  loginDemo: () => Promise<CollectorSnapshot>
  register: (input: RegisterInput) => Promise<CollectorSnapshot>
  logout: () => Promise<void>
  loadSnapshot: () => Promise<CollectorSnapshot>
  reserveLot: (lotId: string, date: string, timeWindow: string) => Promise<CollectorSnapshot>
  saveRoute: (lotIds: string[], date: string) => Promise<CollectorSnapshot>
  cancelPickup: (pickupId: string) => Promise<CollectorSnapshot>
  toggleSavedPoint: (pointId: string) => Promise<CollectorSnapshot>
  createDemandAlert: (alert: Omit<DemandAlert, 'id' | 'matches'>) => Promise<CollectorSnapshot>
  sendMessage: (threadId: string, message: string) => Promise<CollectorSnapshot>
  markNotificationRead: (id: string) => Promise<CollectorSnapshot>
  updateProfile: (input: CollectorProfileUpdate) => Promise<CollectorSnapshot>
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

export interface CollectorProfileUpdate {
  phone: string
  baseLocation: string
  vehicleCapacityKg: number
}

function requireCollector(response: AuthResponse): CollectorSnapshot {
  if (response.user.role !== 'collector' || !response.snapshot) {
    clearAuthTokens()
    throw new ApiClientError('Please sign in with a collector account.', 403, 'wrong_role')
  }
  setAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken })
  return response.snapshot
}

async function reloadSnapshot(): Promise<CollectorSnapshot> {
  return apiRequest<CollectorSnapshot>('/dashboard/collector')
}

export const collectorService: CollectorService = {
  hasSession: () => Boolean(getAuthTokens()),

  login: async (email, password) => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return requireCollector(response)
  },

  loginDemo: () => collectorService.login('collector@polyloop.demo', 'PolyLoop123!'),

  register: async (input) => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        role: 'collector',
      }),
    })
    return requireCollector(response)
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

  loadSnapshot: reloadSnapshot,

  reserveLot: async (lotId, date, timeWindow) => {
    await apiRequest(`/lots/${lotId}/reservations`, {
      method: 'POST',
      body: JSON.stringify({ date, timeWindow }),
    })
    return reloadSnapshot()
  },

  saveRoute: async (lotIds, date) => {
    await apiRequest('/routes', {
      method: 'POST',
      body: JSON.stringify({ lotIds, date, name: 'Collector route' }),
    })
    return reloadSnapshot()
  },

  cancelPickup: async (pickupId) => {
    await apiRequest(`/pickups/${pickupId}/cancel`, { method: 'POST' })
    return reloadSnapshot()
  },

  toggleSavedPoint: async (pointId) => {
    await apiRequest(`/collection-points/${pointId}/save`, { method: 'POST' })
    return reloadSnapshot()
  },

  createDemandAlert: async (alert) => {
    await apiRequest('/demand-alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    })
    return reloadSnapshot()
  },

  sendMessage: async (threadId, message) => {
    await apiRequest(`/message-threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    return reloadSnapshot()
  },

  markNotificationRead: async (id) => {
    await apiRequest(`/notifications/${id}/read`, { method: 'POST' })
    return reloadSnapshot()
  },

  updateProfile: async (input) => {
    await apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({
        phone: input.phone,
        base_location: input.baseLocation,
        vehicle_capacity_kg: input.vehicleCapacityKg,
      }),
    })
    return reloadSnapshot()
  },
}
