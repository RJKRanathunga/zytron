import { useEffect, useState } from 'react'
import { calculateRoute, type RouteEstimate } from '../../../maps/mapService'
import { isValidLatLng } from '../../../maps/googleMaps'
import { useBrowserLocation } from '../../../maps/useBrowserLocation'
import type { CollectionPoint, PlasticLot } from '../../types/domain'
import { formatCurrency, formatKg, formatPlasticBreakdown, getLotValue, getPointForLot } from '../../utils/format'

interface RouteSummaryCardProps {
  lots: PlasticLot[]
  points: CollectionPoint[]
  capacityKg: number
  title?: string
  onSave: () => void
  onRemove: (lotId: string) => void
}

export function RouteSummaryCard({
  lots,
  points,
  capacityKg,
  title = 'Suggested collection run',
  onSave,
  onRemove,
}: RouteSummaryCardProps) {
  const totalKg = lots.reduce((total, lot) => total + lot.quantityKg, 0)
  const totalValue = lots.reduce((total, lot) => total + getLotValue(lot), 0)
  const capacityUse = Math.round((totalKg / capacityKg) * 100)
  const { location, isLoading: isLocationLoading, error: locationError } = useBrowserLocation()
  const [routeState, setRouteState] = useState<{ key: string; route: RouteEstimate | null; error: string }>({
    key: '',
    route: null,
    error: '',
  })
  const destinationKey = lots
    .map((lot) => getPointForLot(lot, points))
    .map((point) => (point ? { lat: point.latitude, lng: point.longitude } : null))
    .filter(isValidLatLng)
    .map((destination) => `${destination.lat},${destination.lng}`)
    .join('|')
  const requestKey = location ? `${location.lat},${location.lng}:${destinationKey}` : ''
  const route = routeState.key === requestKey ? routeState.route : null
  const routeError =
    destinationKey && !location && !isLocationLoading
      ? locationError || 'Allow location access to calculate route distance.'
      : routeState.key === requestKey
        ? routeState.error
        : ''
  const isRouteLoading = Boolean(requestKey && routeState.key !== requestKey)

  useEffect(() => {
    if (!destinationKey || !location) return

    let isCurrent = true
    const destinations = destinationKey.split('|').map((item) => {
      const [lat, lng] = item.split(',').map(Number)
      return { lat, lng }
    })
    calculateRoute(location, destinations)
      .then((estimate) => {
        if (isCurrent) setRouteState({ key: requestKey, route: estimate, error: '' })
      })
      .catch((error: Error) => {
        if (isCurrent) setRouteState({ key: requestKey, route: null, error: error.message || 'Google Routes could not calculate this route.' })
      })

    return () => {
      isCurrent = false
    }
  }, [destinationKey, location, requestKey])

  return (
    <article className="route-card">
      <div className="route-head">
        <div>
          <span className="eyebrow light">Route planner</span>
          <h3>{title}</h3>
        </div>
        <span className="route-total">
          <strong>{formatKg(totalKg)}</strong>
          <small>{lots.length} planned stops</small>
        </span>
      </div>
      <div className="route-stops">
        {lots.map((lot, index) => {
          const point = getPointForLot(lot, points)
          return (
            <div className="stop" key={lot.id}>
              <span className="stop-num">{index + 1}</span>
              <span>
                <strong>{point?.name ?? lot.title}</strong>
                <small>
                  {lot.pickupWindow} - {formatPlasticBreakdown(lot)}
                </small>
              </span>
              <button
                aria-label={`Remove ${lot.title} from route`}
                className="remove-stop"
                type="button"
                onClick={() => onRemove(lot.id)}
              >
                x
              </button>
            </div>
          )
        })}
      </div>
      <div className="route-summary">
        <span>
          Distance<b>{route ? `${route.distanceKm.toFixed(1)} km` : isRouteLoading || isLocationLoading ? 'Loading' : 'Unavailable'}</b>
        </span>
        <span>
          Drive time<b>{route ? `${route.durationMinutes} min` : isRouteLoading || isLocationLoading ? 'Loading' : 'Unavailable'}</b>
        </span>
        <span>
          Purchase value<b>{formatCurrency(totalValue)}</b>
        </span>
        <span>
          Capacity use<b>{capacityUse}%</b>
        </span>
      </div>
      {routeError ? <p className="route-error">{routeError}</p> : null}
      <button className="btn light" disabled={lots.length === 0} type="button" onClick={onSave}>
        Reserve and save route
      </button>
    </article>
  )
}
