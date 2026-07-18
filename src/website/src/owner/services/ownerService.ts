import {
  ApiClientError,
  API_BASE_URL,
  apiRequest,
  clearAuthTokens,
  getAuthTokens,
  setAuthTokens,
  type AuthTokens,
} from '../../services/apiClient'
import type { OwnerSnapshot } from '../types/domain'

interface AuthResponse extends AuthTokens {
  user: {
    role: string
  }
  snapshot?: OwnerSnapshot
}

export interface OwnerService {
  hasSession: () => boolean
  login: (email: string, password: string) => Promise<OwnerSnapshot>
  loginDemo: () => Promise<OwnerSnapshot>
  register: (input: RegisterInput) => Promise<OwnerSnapshot>
  logout: () => Promise<void>
  loadSnapshot: () => Promise<OwnerSnapshot>
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string) => Promise<OwnerSnapshot>
  withdrawLot: (lotId: string) => Promise<OwnerSnapshot>
  acceptOffer: (offerId: string, pickupDate: string, timeWindow: string) => Promise<OwnerSnapshot>
  rejectOffer: (offerId: string) => Promise<OwnerSnapshot>
  updatePickupProgress: (pickupId: string) => Promise<OwnerSnapshot>
  sendMessage: (threadId: string, message: string) => Promise<OwnerSnapshot>
  markNotificationRead: (id: string) => Promise<OwnerSnapshot>
  updateProfile: (input: OwnerProfileUpdate) => Promise<OwnerSnapshot>
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

export interface OwnerProfileUpdate {
  phone: string
}

function requireOwner(response: AuthResponse): OwnerSnapshot {
  if (response.user.role !== 'owner' || !response.snapshot) {
    clearAuthTokens()
    throw new ApiClientError('Please sign in with an owner account.', 403, 'wrong_role')
  }
  setAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken })
  return response.snapshot
}

async function reloadSnapshot(): Promise<OwnerSnapshot> {
  return apiRequest<OwnerSnapshot>('/dashboard/owner')
}

export const ownerService: OwnerService = {
  hasSession: () => Boolean(getAuthTokens()),

  login: async (email, password) => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return requireOwner(response)
  },

  loginDemo: () => ownerService.login('owner@polyloop.demo', 'PolyLoop123!'),

  register: async (input) => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        role: 'owner',
      }),
    })
    return requireOwner(response)
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

  publishLot: async (binId, pricePerKg, pickupWindow) => {
    await apiRequest('/lots', {
      method: 'POST',
      body: JSON.stringify({ binId, pricePerKg, pickupWindow }),
    })
    return reloadSnapshot()
  },

  withdrawLot: async (lotId) => {
    await apiRequest(`/lots/${lotId}/withdraw`, { method: 'POST' })
    return reloadSnapshot()
  },

  acceptOffer: async (offerId, pickupDate, timeWindow) => {
    await apiRequest(`/offers/${offerId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ pickupDate, timeWindow }),
    })
    return reloadSnapshot()
  },

  rejectOffer: async (offerId) => {
    await apiRequest(`/offers/${offerId}/reject`, { method: 'POST' })
    return reloadSnapshot()
  },

  updatePickupProgress: async (pickupId) => {
    await apiRequest(`/pickups/${pickupId}`, { method: 'PATCH' })
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
      body: JSON.stringify({ phone: input.phone }),
    })
    return reloadSnapshot()
  },
}
