import { apiRequest } from '../../services/apiClient'
import { authService } from '../../auth/authService'
import type { CollectorSnapshot, DemandAlert } from '../types/domain'

export interface CollectorService {
  hasSession: () => boolean
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

async function reloadSnapshot(): Promise<CollectorSnapshot> {
  return apiRequest<CollectorSnapshot>('/dashboard/collector')
}

export const collectorService: CollectorService = {
  hasSession: authService.hasSession,

  logout: authService.logout,

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
