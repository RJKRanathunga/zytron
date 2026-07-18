import { apiRequest } from '../services/apiClient'
import type { LatLng } from './googleMaps'

export interface RouteEstimate {
  distanceKm: number
  durationMinutes: number
  polyline?: string
  legs: Array<{
    distanceKm: number
    durationMinutes: number
  }>
}

export function calculateRoute(origin: LatLng, destinations: LatLng[]) {
  return apiRequest<RouteEstimate>('/maps/routes', {
    method: 'POST',
    body: JSON.stringify({ origin, destinations }),
  })
}

export function calculateDistance(origin: LatLng, destination: LatLng) {
  return apiRequest<RouteEstimate>('/maps/distance', {
    method: 'POST',
    body: JSON.stringify({ origin, destination }),
  })
}

export function geocodeAddress(address: string) {
  return apiRequest<{ address: string; latitude: number; longitude: number; placeId?: string }>('/maps/geocode', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}

export function reverseGeocode(location: LatLng) {
  return apiRequest<{ address: string; latitude: number; longitude: number; placeId?: string }>('/maps/reverse-geocode', {
    method: 'POST',
    body: JSON.stringify(location),
  })
}
