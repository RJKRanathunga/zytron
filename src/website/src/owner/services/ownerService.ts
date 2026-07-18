import { apiRequest } from '../../services/apiClient'
import { authService } from '../../auth/authService'
import type { LotPlasticItem, OwnerSnapshot, PlasticMaterial } from '../types/domain'
import type { CheckoutSession, SellerBilling, SellerPackage } from '../types/domain'

export interface OwnerService {
  hasSession: () => boolean
  logout: () => Promise<void>
  loadSnapshot: () => Promise<OwnerSnapshot>
  loadPackages: () => Promise<SellerPackage[]>
  loadBilling: () => Promise<SellerBilling>
  publishLot: (binId: string, pricePerKg: number, pickupWindow: string, plasticItems: LotPlasticItem[]) => Promise<OwnerSnapshot>
  updateLot: (lotId: string, input: LotUpdateInput) => Promise<OwnerSnapshot>
  createSmartBin: (input: SmartBinInput) => Promise<OwnerSnapshot>
  updateSmartBin: (binId: string, input: SmartBinInput) => Promise<OwnerSnapshot>
  removeSmartBin: (binId: string) => Promise<OwnerSnapshot>
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
}

export interface SmartBinInput {
  label: string
  deviceCode: string
  location: string
  model: string
  status: 'online' | 'warning' | 'offline' | 'inactive'
  supportedMaterials: PlasticMaterial[]
}

async function reloadSnapshot(): Promise<OwnerSnapshot> {
  return apiRequest<OwnerSnapshot>('/dashboard/owner')
}

function smartBinPayload(input: SmartBinInput) {
  return {
    label: input.label,
    deviceCode: input.deviceCode,
    location: input.location,
    model: input.model,
    status: input.status,
    supportedMaterials: input.supportedMaterials,
  }
}

export const ownerService: OwnerService = {
  hasSession: authService.hasSession,

  logout: authService.logout,

  loadSnapshot: reloadSnapshot,

  loadPackages: () => apiRequest<SellerPackage[]>('/packages'),

  loadBilling: () => apiRequest<SellerBilling>('/seller/billing'),

  publishLot: async (binId, pricePerKg, pickupWindow, plasticItems) => {
    await apiRequest('/lots', {
      method: 'POST',
      body: JSON.stringify({ binId, pricePerKg, pickupWindow, plasticItems }),
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

  createSmartBin: async (input) => {
    await apiRequest('/bins', {
      method: 'POST',
      body: JSON.stringify(smartBinPayload(input)),
    })
    return reloadSnapshot()
  },

  updateSmartBin: async (binId, input) => {
    await apiRequest(`/bins/${binId}`, {
      method: 'PATCH',
      body: JSON.stringify(smartBinPayload(input)),
    })
    return reloadSnapshot()
  },

  removeSmartBin: async (binId) => {
    await apiRequest(`/bins/${binId}`, { method: 'DELETE' })
    return reloadSnapshot()
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
