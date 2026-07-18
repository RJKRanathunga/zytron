import { appConfig } from '../../config/app-config.js'

export interface LatLng {
  lat: number
  lng: number
}

export interface GoogleMap {
  setCenter(location: unknown): void
  setZoom(zoom: number): void
  fitBounds(bounds: GoogleBounds, padding?: number): void
  panTo(location: unknown): void
}

export interface GoogleBounds {
  extend(location: LatLng): void
  isEmpty(): boolean
}

export interface GoogleMarker {
  setMap(map: GoogleMap | null): void
  addListener(eventName: 'click', handler: () => void): void
}

export interface GooglePolyline {
  setMap(map: GoogleMap | null): void
}

export interface GoogleAutocomplete {
  addListener(eventName: 'place_changed', handler: () => void): void
  getPlace(): {
    geometry?: {
      location?: unknown
    }
  }
}

export interface GoogleMapsRuntime {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
    Marker: new (options: Record<string, unknown>) => GoogleMarker
    LatLngBounds: new () => GoogleBounds
    Polyline: new (options: Record<string, unknown>) => GooglePolyline
    places?: {
      Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GoogleAutocomplete
    }
    geometry?: {
      encoding: {
        decodePath(polyline: string): unknown[]
      }
    }
  }
}

declare global {
  interface Window {
    google?: GoogleMapsRuntime
    __zytronGoogleMapsPromise?: Promise<GoogleMapsRuntime>
  }
}

export function googleMapsBrowserKey() {
  return appConfig.googleMapsBrowserApiKey
}

export function loadGoogleMaps(): Promise<GoogleMapsRuntime> {
  if (window.google?.maps) return Promise.resolve(window.google)
  if (window.__zytronGoogleMapsPromise) return window.__zytronGoogleMapsPromise

  const key = googleMapsBrowserKey()
  if (!key) {
    const error = new Error('Google Maps browser API key is not configured.')
    console.error(error.message)
    return Promise.reject(error)
  }

  window.__zytronGoogleMapsPromise = new Promise((resolve, reject) => {
    const resolveLoaded = () => {
      if (window.google?.maps) {
        resolve(window.google)
        return
      }
      reject(new Error('Google Maps failed to initialize.'))
    }
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', resolveLoaded)
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load.')))
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-js'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.addEventListener('load', resolveLoaded)
    script.addEventListener('error', () => reject(new Error('Google Maps failed to load.')))
    document.head.appendChild(script)
  })

  return window.__zytronGoogleMapsPromise
}

export function isValidLatLng(value: Partial<LatLng> | null | undefined): value is LatLng {
  return (
    typeof value?.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180
  )
}
