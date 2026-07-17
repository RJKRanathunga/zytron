import { useState } from 'react'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function SettingsPage() {
  const app = useOwnerApp()
  const [autoPublish, setAutoPublish] = useState(false)
  const [offerNotifications, setOfferNotifications] = useState(true)
  const [deviceAlerts, setDeviceAlerts] = useState(true)
  const [accessWindow, setAccessWindow] = useState('8:00 AM-5:00 PM')
  const [minPrice, setMinPrice] = useState('105')

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Point settings</span>
          <h1>Control publishing preferences, pickup windows and device alerts.</h1>
          <p>These UI preferences stay local while bins, offers and pickups sync with the Flask API.</p>
        </div>
      </section>
      <section className="grid-main">
        <article className="panel">
          <div className="settings-list">
            <label className="toggle-row">
              <span>
                <strong>Auto-publish ready lots</strong>
                <small>Draft lots when compartments cross their threshold.</small>
              </span>
              <input checked={autoPublish} type="checkbox" onChange={(event) => setAutoPublish(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Collector offer notifications</strong>
                <small>Notify me when collectors submit or update offers.</small>
              </span>
              <input checked={offerNotifications} type="checkbox" onChange={(event) => setOfferNotifications(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Device-health alerts</strong>
                <small>Notify me when sensors need inspection.</small>
              </span>
              <input checked={deviceAlerts} type="checkbox" onChange={(event) => setDeviceAlerts(event.target.checked)} />
            </label>
          </div>
        </article>
        <article className="panel">
          <form
            className="form-grid single"
            onSubmit={(event) => {
              event.preventDefault()
              app.showToast({
                title: 'Point settings saved',
                detail: `Default access is ${accessWindow} and minimum price is Rs. ${minPrice}/kg.`,
              })
            }}
          >
            <label className="field">
              <span>Default access window</span>
              <input value={accessWindow} onChange={(event) => setAccessWindow(event.target.value)} />
            </label>
            <label className="field">
              <span>Default minimum price per kg</span>
              <input min="1" type="number" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
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
