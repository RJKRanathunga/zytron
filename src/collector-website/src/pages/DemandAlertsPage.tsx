import { useState } from 'react'
import { EmptyState } from '../components/common/EmptyState'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useCollectorApp } from '../hooks/useCollectorApp'
import type { MaterialFilter } from '../types/domain'

const materials: readonly MaterialFilter[] = ['PP', 'PET', 'HDPE', 'LDPE', 'All']

export function DemandAlertsPage() {
  const app = useCollectorApp()
  const [material, setMaterial] = useState<MaterialFilter>('PP')
  const [minimumKg, setMinimumKg] = useState('20')
  const [radiusKm, setRadiusKm] = useState('15')
  const [maxPrice, setMaxPrice] = useState('105')
  const [readyWindow, setReadyWindow] = useState('Ready within 48 hours')
  const [error, setError] = useState('')

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Saved demand</span>
          <h1>Turn buying demand into automatic supply alerts.</h1>
          <p>Create material watches for nearby plastic that meets your minimum quantity, radius and price limits.</p>
        </div>
      </section>

      <section className="grid-main">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Create alert</span>
              <h3>Demand alert form</h3>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              const kg = Number(minimumKg)
              const radius = Number(radiusKm)
              const price = Number(maxPrice)
              if (Number.isNaN(kg) || kg < 1 || Number.isNaN(radius) || radius < 1) {
                setError('Enter a valid quantity and radius.')
                return
              }
              setError('')
              app.createDemandAlert({
                label: `${material} minimum ${kg} kg`,
                material,
                minimumKg: kg,
                radiusKm: radius,
                readyWindow,
                maxPricePerKg: Number.isNaN(price) ? undefined : price,
              })
            }}
          >
            <label className="field">
              <span>Material</span>
              <SegmentedControl label="Demand material" options={materials} value={material} onChange={setMaterial} />
            </label>
            <label className="field">
              <span>Minimum quantity in kg</span>
              <input min="1" type="number" value={minimumKg} onChange={(event) => setMinimumKg(event.target.value)} />
            </label>
            <label className="field">
              <span>Search radius in km</span>
              <input min="1" type="number" value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)} />
            </label>
            <label className="field">
              <span>Maximum price per kg</span>
              <input min="1" type="number" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
            </label>
            <label className="field full-span">
              <span>Ready window</span>
              <select value={readyWindow} onChange={(event) => setReadyWindow(event.target.value)}>
                <option>Ready within 48 hours</option>
                <option>Weekday pickup</option>
                <option>Flexible date</option>
                <option>Verified points only</option>
              </select>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn primary full-span" type="submit">
              Create demand alert
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Active watches</span>
              <h3>Saved material alerts</h3>
            </div>
          </div>
          {app.demandAlerts.length > 0 ? (
            <div className="demand-list">
              {app.demandAlerts.map((alert) => (
                <div className="demand" key={alert.id}>
                  <span className="demand-icon">{alert.material === 'All' ? 'A' : alert.material}</span>
                  <div>
                    <strong>{alert.label}</strong>
                    <small>
                      {alert.minimumKg} kg min - within {alert.radiusKm} km - {alert.readyWindow}
                    </small>
                  </div>
                  <span className="match">{alert.matches} matches</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No saved alerts" body="Create an alert to watch for plastic that matches your demand." />
          )}
        </article>
      </section>
    </div>
  )
}
