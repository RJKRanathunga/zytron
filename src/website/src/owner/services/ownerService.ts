import { apiRequest } from '../../services/apiClient'
import { authService } from '../../auth/authService'
import type { Dustbin, LotPlasticItem, OwnerSnapshot } from '../types/domain'
import type { CheckoutSession, SellerBilling, SellerPackage } from '../types/domain'

export interface OwnerService {
  hasSession: () => boolean
  logout: () => Promise<void>
  loadSnapshot: () => Promise<OwnerSnapshot>
  loadPackages: () => Promise<SellerPackage[]>
  loadBilling: () => Promise<SellerBilling>
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string, plasticItems: LotPlasticItem[], dustbinId?: string) => Promise<OwnerSnapshot>
  updateLot: (lotId: string, input: LotUpdateInput) => Promise<OwnerSnapshot>
  createDustbin: (input: DustbinInput) => Promise<OwnerSnapshot>
  updateDustbin: (dustbinId: string, input: DustbinInput) => Promise<OwnerSnapshot>
  deleteDustbin: (dustbinId: string) => Promise<{ snapshot: OwnerSnapshot; message?: string }>
  createSubscriptionCheckout: () => Promise<CheckoutSession>
  cancelSubscription: () => Promise<SellerBilling>
  createListingPaymentCheckout: (lotId: string) => Promise<CheckoutSession>
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

export interface LotUpdateInput {
  pricePerKg: number
  plasticItems: LotPlasticItem[]
  dustbinId?: string
}

export interface DustbinInput {
  name: string
  code: string
  locationAddress: string
  latitude: number
  longitude: number
  supportedPlasticType: Dustbin['supportedPlasticType']
  description: string
  isActive: boolean
}

async function reloadSnapshot(): Promise<OwnerSnapshot> {
  return apiRequest<OwnerSnapshot>('/dashboard/owner')
}

export const ownerService: OwnerService = {
  hasSession: authService.hasSession,

  logout: authService.logout,

  loadSnapshot: reloadSnapshot,

  loadPackages: () => apiRequest<SellerPackage[]>('/packages'),

  loadBilling: () => apiRequest<SellerBilling>('/seller/billing'),

  publishLot: async (binId, pricePerKg, pickupWindow, plasticItems, dustbinId) => {
    await apiRequest('/lots', {
      method: 'POST',
      body: JSON.stringify({ binId, pricePerKg, pickupWindow, plasticItems, dustbinId }),
    })
    return reloadSnapshot()
  },

  updateLot: async (lotId, input) => {
    await apiRequest(`/lots/${lotId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return reloadSnapshot()
  },

  createDustbin: async (input) => {
    await apiRequest('/owner/dustbins', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return reloadSnapshot()
  },

  updateDustbin: async (dustbinId, input) => {
    await apiRequest(`/owner/dustbins/${dustbinId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return reloadSnapshot()
  },

  deleteDustbin: async (dustbinId) => {
    const result = await apiRequest<{ deleted: boolean; inactive?: boolean; message?: string }>(`/owner/dustbins/${dustbinId}`, {
      method: 'DELETE',
    })
    return { snapshot: await reloadSnapshot(), message: result.message }
  },

  createSubscriptionCheckout: () => apiRequest<CheckoutSession>('/seller/subscription/checkout', { method: 'POST' }),

  cancelSubscription: async () => {
    await apiRequest('/seller/subscription/cancel', { method: 'POST' })
    return ownerService.loadBilling()
  },

  createListingPaymentCheckout: (lotId) => apiRequest<CheckoutSession>(`/lots/${lotId}/payment/checkout`, { method: 'POST' }),

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
