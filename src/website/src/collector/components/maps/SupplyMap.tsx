import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoute } from '../../../maps/mapService'
import {
  isValidLatLng,
  loadGoogleMaps,
  type GoogleMap,
  type GoogleMarker,
  type GooglePolyline,
  type LatLng,
} from '../../../maps/googleMaps'
import { useBrowserLocation } from '../../../maps/useBrowserLocation'
import type { CollectionPoint, PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg, getLotValue } from '../../utils/format'

interface SupplyMapProps {
  lots: PlasticLot[]
  points: CollectionPoint[]
  selectedLotId?: string
  routeLotIds: string[]
  onSelectLot: (lotId: string) => void
  onAddToRoute: (lotId: string) => void
}

const DEFAULT_CENTER: LatLng = { lat: 6.7969, lng: 79.9008 }

export function SupplyMap({
  lots,
  points,
  selectedLotId,
  routeLotIds,
  onSelectLot,
  onAddToRoute,
}: SupplyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const markersRef = useRef<GoogleMarker[]>([])
  const routeLineRef = useRef<GooglePolyline | null>(null)
  const [mapError, setMapError] = useState('')
  const [isMapLoading, setMapLoading] = useState(true)
  const [routeState, setRouteState] = useState<{ key: string; error: string }>({ key: '', error: '' })
  const { location: userLocation, isLoading: isLocationLoading, error: locationError } = useBrowserLocation()

  const pointById = useMemo(() => new Map(points.map((point) => [point.id, point])), [points])
  const selectedLot = lots.find((item) => item.id === selectedLotId)
  const selectedPoint = selectedLot ? pointById.get(selectedLot.collectionPointId) : undefined
  const routeDestinationKey = routeLotIds
    .map((lotId) => lots.find((lot) => lot.id === lotId))
    .map((lot) => (lot ? pointById.get(lot.collectionPointId) : undefined))
    .map((point) => (point ? { lat: point.latitude, lng: point.longitude } : null))
    .filter(isValidLatLng)
    .map((destination) => `${destination.lat},${destination.lng}`)
    .join('|')
  const routeDestinations = useMemo(
    () =>
      routeDestinationKey
        ? routeDestinationKey.split('|').map((item) => {
            const [lat, lng] = item.split(',').map(Number)
            return { lat, lng }
          })
        : [],
    [routeDestinationKey],
  )
  const routeKey = userLocation
    ? `${userLocation.lat},${userLocation.lng}:${routeDestinationKey}`
    : ''
  const isRouteLoading = Boolean(routeKey && routeState.key !== routeKey)
  const routeError =
    routeDestinations.length > 0 && !userLocation && !isLocationLoading
      ? locationError || 'Allow location access to draw a route from your current position.'
      : routeState.key === routeKey
        ? routeState.error
        : ''

  useEffect(() => {
    let isMounted = true

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !containerRef.current) return
        const firstPoint = points.find((point) => isValidLatLng({ lat: point.latitude, lng: point.longitude }))
        const center = userLocation ?? (firstPoint ? { lat: firstPoint.latitude, lng: firstPoint.longitude } : DEFAULT_CENTER)
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: firstPoint || userLocation ? 12 : 10,
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

    lots.forEach((lot) => {
      const point = pointById.get(lot.collectionPointId)
      const position = point ? { lat: point.latitude, lng: point.longitude } : null
      if (!isValidLatLng(position)) return

      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: `${lot.title} at ${point?.name}`,
        label: lot.material,
      })
      marker.addListener('click', () => onSelectLot(lot.id))
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
  }, [lots, onSelectLot, pointById, userLocation])

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    routeLineRef.current?.setMap(null)
    routeLineRef.current = null

    if (routeDestinations.length === 0 || !userLocation) return

    let isCurrent = true
    calculateRoute(userLocation, routeDestinations)
      .then((route) => {
        if (!isCurrent) return
        if (route.polyline && window.google?.maps?.geometry) {
          const path = window.google.maps.geometry.encoding.decodePath(route.polyline)
          routeLineRef.current = new window.google.maps.Polyline({
            map: mapRef.current,
            path,
            strokeColor: '#08755b',
            strokeOpacity: 0.85,
            strokeWeight: 5,
          })
        }
        setRouteState({ key: routeKey, error: '' })
      })
      .catch((error: Error) => {
        if (isCurrent) setRouteState({ key: routeKey, error: error.message || 'Google Maps could not calculate this route.' })
      })

    return () => {
      isCurrent = false
    }
  }, [routeDestinations, routeKey, userLocation])

  useEffect(() => {
    if (!mapRef.current || !selectedPoint) return
    mapRef.current?.panTo({ lat: selectedPoint.latitude, lng: selectedPoint.longitude })
  }, [selectedPoint])

  return (
    <article className="panel map-panel real-map-panel">
      <div className="map-search">
        <input ref={searchRef} aria-label="Search map address" placeholder="Search address" type="search" />
      </div>
      <div ref={containerRef} className="google-map-canvas" role="region" aria-label="Collection supply map"></div>
      {(isMapLoading || isLocationLoading || isRouteLoading) && (
        <div className="map-status">{isMapLoading ? 'Loading Google Maps...' : isLocationLoading ? 'Requesting location...' : 'Calculating route...'}</div>
      )}
      {(mapError || locationError || routeError) && (
        <div className="map-error">{mapError || routeError || locationError}</div>
      )}
      <div className="map-controls">
        <button type="button" onClick={() => selectedLotId && onAddToRoute(selectedLotId)} aria-label="Add selected lot to route">
          +
        </button>
        <button type="button" onClick={() => userLocation && mapRef.current?.panTo(userLocation)} aria-label="Center on your location">
          i
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-available"></i>Available
        </span>
        <span>
          <i className="legend-route"></i>Route
        </span>
        <span>
          <i className="legend-selected"></i>Your location
        </span>
      </div>
      {selectedLot ? (
        <div className="map-selected-card">
          <strong>{selectedLot.title}</strong>
          <small>{selectedPoint?.name ?? 'Collection point'}</small>
          <b>{formatCurrency(getLotValue(selectedLot))}</b>
          <small>{formatKg(selectedLot.quantityKg)} {selectedLot.material}</small>
          <button className="mini-btn accept" type="button" onClick={() => onAddToRoute(selectedLot.id)}>
            Add to route
          </button>
        </div>
      ) : null}
    </article>
  )
}
