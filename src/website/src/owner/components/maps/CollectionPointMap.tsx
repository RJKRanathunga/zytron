import { useEffect, useRef, useState } from 'react'
import { isValidLatLng, loadGoogleMaps, type GoogleMap, type GoogleMarker, type LatLng } from '../../../maps/googleMaps'
import { useBrowserLocation } from '../../../maps/useBrowserLocation'
import type { CollectionPoint, SmartBin } from '../../types/domain'

interface CollectionPointMapProps {
  points: CollectionPoint[]
  bins: SmartBin[]
  selectedPointId: string
  onSelect: (pointId: string) => void
}

const DEFAULT_CENTER: LatLng = { lat: 6.7969, lng: 79.9008 }

export function CollectionPointMap({ points, bins, selectedPointId, onSelect }: CollectionPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const markersRef = useRef<GoogleMarker[]>([])
  const [mapError, setMapError] = useState('')
  const [isMapLoading, setMapLoading] = useState(true)
  const { location: userLocation, isLoading: isLocationLoading, error: locationError } = useBrowserLocation()
  const selectedPoint = points.find((point) => point.id === selectedPointId)

  useEffect(() => {
    let isMounted = true

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !containerRef.current) return
        const firstPoint = points.find((point) => isValidLatLng({ lat: point.latitude, lng: point.longitude }))
        const center = userLocation ?? (firstPoint ? { lat: firstPoint.latitude, lng: firstPoint.longitude } : DEFAULT_CENTER)
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: firstPoint || userLocation ? 13 : 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        if (searchRef.current && google.maps.places) {
          const autocomplete = new google.maps.places.Autocomplete(searchRef.current, {
            fields: ['geometry', 'formatted_address', 'name'],
          })
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            const placeLocation = place.geometry?.location
            if (!placeLocation) {
              setMapError('Invalid address. Choose a result with a mapped location.')
              return
            }
            const map = mapRef.current
            if (!map) return
            setMapError('')
            map.setCenter(placeLocation)
            map.setZoom(15)
          })
        }

        setMapLoading(false)
      })
      .catch((error: Error) => {
        if (!isMounted) return
        setMapError(error.message || 'Google Maps failed to load.')
        setMapLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [points, userLocation])

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    const google = window.google
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    const bounds = new google.maps.LatLngBounds()

    points.forEach((point) => {
      const position = { lat: point.latitude, lng: point.longitude }
      if (!isValidLatLng(position)) return
      const pointBins = bins.filter((bin) => bin.collectionPointId === point.id)
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: `${point.name} - ${point.address}`,
        label: String(pointBins.length),
      })
      marker.addListener('click', () => onSelect(point.id))
      markersRef.current.push(marker)
      bounds.extend(position)
    })

    if (userLocation) {
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: userLocation,
        title: 'Your current location',
        label: 'You',
      })
      markersRef.current.push(marker)
      bounds.extend(userLocation)
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 56)
    }
  }, [bins, onSelect, points, userLocation])

  useEffect(() => {
    if (!mapRef.current || !selectedPoint) return
    mapRef.current?.panTo({ lat: selectedPoint.latitude, lng: selectedPoint.longitude })
  }, [selectedPoint])

  return (
    <article className="panel map-panel real-map-panel">
      <div className="map-search">
        <input ref={searchRef} aria-label="Search map address" placeholder="Search address" type="search" />
      </div>
      <div ref={containerRef} className="google-map-canvas" role="region" aria-label="Collection point map"></div>
      {(isMapLoading || isLocationLoading) && (
        <div className="map-status">{isMapLoading ? 'Loading Google Maps...' : 'Requesting location...'}</div>
      )}
      {(mapError || locationError) && <div className="map-error">{mapError || locationError}</div>}
      <div className="map-legend">
        <span>
          <i className="legend-available"></i>Collection point
        </span>
        <span>
          <i className="legend-selected"></i>Your location
        </span>
      </div>
    </article>
  )
}
