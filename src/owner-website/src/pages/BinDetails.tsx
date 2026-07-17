import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { MaterialBadge } from '../components/common/MaterialBadge'
import { StatusBadge } from '../components/common/StatusBadge'
import { useOwnerApp } from '../hooks/useOwnerApp'
import { formatKg } from '../utils/format'

export function BinDetails() {
  const { binId } = useParams()
  const app = useOwnerApp()
  const navigate = useNavigate()
  const bin = app.smartBins.find((item) => item.id === binId)

  if (!bin) return <Navigate to="/bins" replace />

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Bin details</span>
          <h1>{bin.label}</h1>
          <p>{bin.location} bin details, plastic compartments and device status.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/bins')}>
            Back to bins
          </button>
          <button className="btn primary" type="button" onClick={() => app.openPublishModal(bin.id)}>
            Publish ready plastic
          </button>
        </div>
      </section>
      <section className="grid-main">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Compartments</span>
              <h3>Plastic compartments</h3>
            </div>
            <StatusBadge label={bin.status} tone={bin.status} />
          </div>
          <div className="compartment-list large">
            {bin.compartments.map((compartment) => (
              <div className="material-row" key={compartment.id}>
                <MaterialBadge material={compartment.material} />
                <div>
                  <strong>{compartment.material} compartment</strong>
                  <small>{formatKg(compartment.quantityKg)} measured plastic</small>
                  <div className="progress">
                    <i style={{ width: `${compartment.fillLevel}%` }}></i>
                  </div>
                </div>
                <StatusBadge label={compartment.status} tone={compartment.status} />
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Device</span>
              <h3>Sensor status</h3>
            </div>
          </div>
          <div className="summary-grid">
            <div>
              <small>Battery</small>
              <strong>{bin.batteryPercent}%</strong>
            </div>
            <div>
              <small>Last sync</small>
              <strong>{bin.lastSync}</strong>
            </div>
            <div>
              <small>Camera</small>
              <strong>{bin.cameraStatus}</strong>
            </div>
            <div>
              <small>Weight sensor</small>
              <strong>{bin.weightSensorStatus}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
