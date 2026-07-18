import { useState } from 'react'
import { MetricCard } from '../components/cards/MetricCard'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function ProfilePage() {
  const app = useOwnerApp()
  const [name, setName] = useState(app.user.organization)
  const [email, setEmail] = useState(app.user.email)
  const [phone, setPhone] = useState(app.user.phone)
  const [address, setAddress] = useState(app.user.collectionPointAddress)

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Owner profile</span>
          <h1>Keep collection-point details accurate for collectors.</h1>
          <p>Collectors use these details when requesting reservations, arriving for pickups and sending messages.</p>
        </div>
      </section>
      <section className="metrics">
        <MetricCard tone="mint" icon="V" label="Verification" value="Active" detail="Collection point approved" />
        <MetricCard tone="blue" icon="B" label="Smart bins" value={String(app.smartBins.length)} detail="Connected devices" />
        <MetricCard tone="sun" icon="O" label="Open offers" value={String(app.offers.filter((offer) => offer.status === 'new').length)} detail="Ready for review" />
        <MetricCard tone="violet" icon="$" label="Payout method" value="Bank" detail="Primary transfer method" />
      </section>
      <section className="panel">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            app.updateProfile({ phone })
          }}
        >
          <label className="field">
            <span>Collection point name</span>
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
            <span>Address</span>
            <input required value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>
          <button className="btn primary full-span" type="submit">
            Save profile
          </button>
        </form>
      </section>
    </div>
  )
}
