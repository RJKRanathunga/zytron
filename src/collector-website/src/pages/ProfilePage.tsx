import { useState } from 'react'
import { MetricCard } from '../components/cards/MetricCard'
import { useCollectorApp } from '../hooks/useCollectorApp'

export function ProfilePage() {
  const app = useCollectorApp()
  const [name, setName] = useState(app.user.organization)
  const [email, setEmail] = useState(app.user.email)
  const [phone, setPhone] = useState(app.user.phone)
  const [baseLocation, setBaseLocation] = useState(app.user.baseLocation)
  const [capacity, setCapacity] = useState(String(app.user.vehicleCapacityKg))

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Collector profile</span>
          <h1>Keep your verified collector profile ready for owners.</h1>
          <p>Owners see your name, location, pickup capacity and contact details when reviewing reservations.</p>
        </div>
      </section>

      <section className="metrics">
        <MetricCard tone="mint" icon="V" label="Verification" value="Active" detail="Collector profile approved" />
        <MetricCard tone="blue" icon="C" label="Vehicle capacity" value={`${app.user.vehicleCapacityKg} kg`} detail="Route planner capacity" />
        <MetricCard tone="sun" icon="R" label="Reliability" value="96%" detail="On-time handover rate" />
        <MetricCard tone="violet" icon="P" label="Partner points" value={String(app.savedPointIds.length)} detail="Saved collection points" />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Editable details</span>
            <h3>Profile settings</h3>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            app.showToast({
              title: 'Profile details saved',
              detail: `${name} will be shown on future reservation requests.`,
            })
          }}
        >
          <label className="field">
            <span>Organization name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field">
            <span>Base location</span>
            <input required value={baseLocation} onChange={(event) => setBaseLocation(event.target.value)} />
          </label>
          <label className="field">
            <span>Vehicle capacity in kg</span>
            <input min="1" required type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          </label>
          <button className="btn primary full-span" type="submit">
            Save profile
          </button>
        </form>
      </section>
    </div>
  )
}
