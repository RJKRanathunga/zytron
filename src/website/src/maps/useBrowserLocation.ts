import { useEffect, useState } from 'react'
import type { LatLng } from './googleMaps'

interface BrowserLocationState {
  location: LatLng | null
  isLoading: boolean
  error: string
}

export function useBrowserLocation() {
  const hasGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
  const [state, setState] = useState<BrowserLocationState>({
    location: null,
    isLoading: hasGeolocation,
    error: hasGeolocation ? '' : 'Location is not available in this browser.',
  })

  useEffect(() => {
    if (!hasGeolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          isLoading: false,
          error: '',
        })
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Your current location is unavailable.'
              : 'Location request timed out.'
        setState({ location: null, isLoading: false, error: message })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [hasGeolocation])

  return state
}
