import { useState } from 'react'
import { useCollectorApp } from '../hooks/useCollectorApp'

export function SettingsPage() {
  const app = useCollectorApp()
  const [autoRoute, setAutoRoute] = useState(true)
  const [notifySupply, setNotifySupply] = useState(true)
  const [notifyPayments, setNotifyPayments] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [defaultRadius, setDefaultRadius] = useState('15')

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Settings</span>
          <h1>Set collector preferences for routing and alerts.</h1>
          <p>These UI preferences stay local while supply, routes and pickups sync with the Flask API.</p>
        </div>
      </section>

      <section className="grid-main">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Preferences</span>
              <h3>Route and notification controls</h3>
            </div>
          </div>
          <div className="settings-list">
            <label className="toggle-row">
              <span>
                <strong>Auto-suggest compact routes</strong>
                <small>Prioritize lots that keep distance and idle time low.</small>
              </span>
              <input checked={autoRoute} type="checkbox" onChange={(event) => setAutoRoute(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Supply notifications</strong>
                <small>Alert me when demand-matching plastic appears nearby.</small>
              </span>
              <input checked={notifySupply} type="checkbox" onChange={(event) => setNotifySupply(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Payment notifications</strong>
                <small>Tell me when holds, releases or refunds change.</small>
              </span>
              <input checked={notifyPayments} type="checkbox" onChange={(event) => setNotifyPayments(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Reduced motion</strong>
                <small>Keep transitions calm for motion-sensitive users.</small>
              </span>
              <input checked={reducedMotion} type="checkbox" onChange={(event) => setReducedMotion(event.target.checked)} />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Defaults</span>
              <h3>Collector search defaults</h3>
            </div>
          </div>
          <form
            className="form-grid single"
            onSubmit={(event) => {
              event.preventDefault()
              app.showToast({
                title: 'Settings saved',
                detail: `Default search radius is now ${defaultRadius} km.`,
              })
            }}
          >
            <label className="field">
              <span>Default demand radius</span>
              <input min="1" type="number" value={defaultRadius} onChange={(event) => setDefaultRadius(event.target.value)} />
            </label>
            <label className="field">
              <span>Default pickup window</span>
              <select defaultValue="morning">
                <option value="morning">Morning route</option>
                <option value="afternoon">Afternoon route</option>
                <option value="any">Any available window</option>
              </select>
            </label>
            <button className="btn primary" type="submit">
              Save settings
            </button>
            <button className="btn secondary" type="button" onClick={app.logout}>
              Log out
            </button>
          </form>
        </article>
      </section>
    </div>
  )
}
