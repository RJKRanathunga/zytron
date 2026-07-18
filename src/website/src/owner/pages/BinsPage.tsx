import { useMemo, useState } from 'react'
import { BinCard } from '../components/cards/BinCard'
import { SegmentedControl } from '../components/common/SegmentedControl'
import { useOwnerApp, type SmartBinFormInput } from '../hooks/useOwnerApp'
import type { MaterialFilter, PlasticMaterial, SmartBin } from '../types/domain'
import { MATERIAL_FILTER_OPTIONS, PLASTIC_MATERIAL_CODES, plasticMaterialLabel } from '../../config/plasticMaterials'

const materialOptions = MATERIAL_FILTER_OPTIONS satisfies readonly MaterialFilter[]

const defaultForm = (collectionPointId: string): SmartBinFormInput => ({
  collectionPointId,
  label: '',
  deviceCode: '',
  location: '',
  model: 'Manual Smart Bin',
  status: 'online',
  supportedMaterials: ['PET'],
})

const formFromBin = (bin: SmartBin): SmartBinFormInput => ({
  collectionPointId: bin.collectionPointId,
  label: bin.label,
  deviceCode: bin.deviceCode,
  location: bin.location,
  model: bin.model || 'Manual Smart Bin',
  status: bin.status,
  supportedMaterials: bin.supportedMaterials.length > 0 ? bin.supportedMaterials : bin.compartments.map((item) => item.material),
})

export function BinsPage() {
  const app = useOwnerApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SmartBinFormInput>(() => defaultForm(app.selectedPointId || app.collectionPoints[0]?.id || ''))
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const bins = useMemo(() => {
    const normalizedQuery = app.searchQuery.trim().toLowerCase()
    return app.smartBins.filter((bin) => {
      const materialMatch =
        app.activeMaterial === 'All' || bin.compartments.some((compartment) => compartment.material === app.activeMaterial)
      const searchable = `${bin.label} ${bin.location} ${bin.status}`.toLowerCase()
      return materialMatch && (normalizedQuery.length === 0 || searchable.includes(normalizedQuery))
    })
  }, [app.activeMaterial, app.searchQuery, app.smartBins])

  const openNew = () => {
    setEditingId('')
    setForm(defaultForm(app.selectedPointId || app.collectionPoints[0]?.id || ''))
    setFormError('')
  }

  const openEdit = (binId: string) => {
    const bin = app.smartBins.find((item) => item.id === binId)
    if (!bin) return
    setEditingId(bin.id)
    setForm(formFromBin(bin))
    setFormError('')
  }

  const toggleMaterial = (material: PlasticMaterial) => {
    const hasMaterial = form.supportedMaterials.includes(material)
    setForm({
      ...form,
      supportedMaterials: hasMaterial
        ? form.supportedMaterials.filter((item) => item !== material)
        : [...form.supportedMaterials, material],
    })
  }

  const validate = () => {
    if (!form.collectionPointId) return 'Choose a collection point.'
    if (form.label.trim().length < 2) return 'Enter a smart bin label.'
    if (form.deviceCode.trim().length < 2) return 'Enter a smart bin code.'
    if (form.location.trim().length < 2) return 'Enter a location label.'
    if (form.supportedMaterials.length === 0) return 'Select at least one supported plastic type.'
    return ''
  }

  const submit = async () => {
    const error = validate()
    setFormError(error)
    if (error) return
    setSaving(true)
    const cleanInput = {
      ...form,
      label: form.label.trim(),
      deviceCode: form.deviceCode.trim(),
      location: form.location.trim(),
      model: form.model.trim() || 'Manual Smart Bin',
    }
    try {
      if (editingId) await app.updateSmartBin(editingId, cleanInput)
      else await app.createSmartBin(cleanInput)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const removeSmartBin = (bin: SmartBin) => {
    const confirmed = window.confirm(`Remove ${bin.label}? This will mark the smart bin inactive and keep linked records intact.`)
    if (!confirmed) return
    void app.removeSmartBin(bin.id)
  }

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Smart-bin inventory</span>
          <h1>Manage smart bins, device status and supported plastic types.</h1>
          <p>Filter bins by material, register supported plastic types and publish lots with manually entered weights.</p>
        </div>
        <div className="heading-actions">
          <SegmentedControl label="Bin material filter" options={materialOptions} value={app.activeMaterial} onChange={app.setActiveMaterial} />
          <button className="btn primary" type="button" onClick={openNew}>
            Add smart bin
          </button>
        </div>
      </section>
      {editingId !== null ? (
        <section className="panel smart-bin-form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{editingId ? 'Edit smart bin' : 'New smart bin'}</span>
              <h3>{editingId ? 'Update smart bin details' : 'Add a smart bin'}</h3>
            </div>
            <button className="mini-btn" type="button" onClick={() => setEditingId(null)}>
              Close
            </button>
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <label className="field">
              <span>Collection point</span>
              <select value={form.collectionPointId} onChange={(event) => setForm({ ...form, collectionPointId: event.target.value })}>
                {app.collectionPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Smart bin label</span>
              <input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
            </label>
            <label className="field">
              <span>Smart bin code</span>
              <input required value={form.deviceCode} onChange={(event) => setForm({ ...form, deviceCode: event.target.value })} />
            </label>
            <label className="field">
              <span>Location label</span>
              <input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
            <label className="field">
              <span>Model</span>
              <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SmartBinFormInput['status'] })}>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="offline">Offline</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <fieldset className="field full-span checkbox-grid">
              <legend>Supported plastic types</legend>
              {PLASTIC_MATERIAL_CODES.map((material) => (
                <label className="check-line" key={material}>
                  <input
                    checked={form.supportedMaterials.includes(material)}
                    type="checkbox"
                    onChange={() => toggleMaterial(material)}
                  />
                  <span>{plasticMaterialLabel(material)}</span>
                </label>
              ))}
            </fieldset>
            {formError ? <p className="form-error">{formError}</p> : null}
            <button className="btn primary full-span" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Save smart bin' : 'Add smart bin'}
            </button>
          </form>
        </section>
      ) : null}
      <section className="bin-grid wide">
        {bins.map((bin) => (
          <BinCard key={bin.id} bin={bin} onEdit={openEdit} onPublish={app.openPublishModal} onRemove={removeSmartBin} />
        ))}
      </section>
    </div>
  )
}
