import { useMemo, useState } from 'react'
import { EmptyState } from '../components/common/EmptyState'
import { MaterialBadge } from '../components/common/MaterialBadge'
import { useOwnerApp, type DustbinFormInput } from '../hooks/useOwnerApp'
import type { Dustbin } from '../types/domain'
import { PLASTIC_MATERIAL_CODES, plasticMaterialLabel } from '../../config/plasticMaterials'

const emptyForm: DustbinFormInput = {
  name: '',
  code: '',
  locationAddress: '',
  latitude: 6.9271,
  longitude: 79.8612,
  supportedPlasticType: 'PET',
  description: '',
  isActive: true,
}

function dateLabel(value: string) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formFromDustbin(dustbin: Dustbin): DustbinFormInput {
  return {
    name: dustbin.name,
    code: dustbin.code,
    locationAddress: dustbin.locationAddress,
    latitude: dustbin.latitude,
    longitude: dustbin.longitude,
    supportedPlasticType: dustbin.supportedPlasticType,
    description: dustbin.description,
    isActive: dustbin.isActive,
  }
}

export function DustbinsPage() {
  const app = useOwnerApp()
  const [selectedId, setSelectedId] = useState(app.dustbins[0]?.id ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DustbinFormInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredDustbins = useMemo(() => {
    const query = app.searchQuery.trim().toLowerCase()
    return app.dustbins.filter((dustbin) => {
      const searchable = `${dustbin.name} ${dustbin.code} ${dustbin.locationAddress} ${dustbin.supportedPlasticType}`.toLowerCase()
      return !query || searchable.includes(query)
    })
  }, [app.dustbins, app.searchQuery])
  const selected = app.dustbins.find((dustbin) => dustbin.id === selectedId) ?? filteredDustbins[0]
  const isEditing = editingId !== null

  const openNew = () => {
    setEditingId('')
    setForm(emptyForm)
    setFormError('')
  }

  const openEdit = (dustbin: Dustbin) => {
    setSelectedId(dustbin.id)
    setEditingId(dustbin.id)
    setForm(formFromDustbin(dustbin))
    setFormError('')
  }

  const validate = () => {
    if (form.name.trim().length < 2) return 'Enter a dustbin name.'
    if (form.code.trim().length < 2) return 'Enter a dustbin code or reference.'
    if (form.locationAddress.trim().length < 2) return 'Enter a location or address.'
    if (!Number.isFinite(form.latitude) || form.latitude < -90 || form.latitude > 90) return 'Latitude must be between -90 and 90.'
    if (!Number.isFinite(form.longitude) || form.longitude < -180 || form.longitude > 180) return 'Longitude must be between -180 and 180.'
    return ''
  }

  const submit = async () => {
    const error = validate()
    setFormError(error)
    if (error) return
    setSaving(true)
    const cleanInput = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      locationAddress: form.locationAddress.trim(),
      description: form.description.trim(),
    }
    try {
      if (editingId) await app.updateDustbin(editingId, cleanInput)
      else await app.createDustbin(cleanInput)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const deleteSelected = async (dustbin: Dustbin) => {
    if (!window.confirm(`Remove ${dustbin.name}? Active linked records may mark it inactive instead.`)) return
    setDeletingId(dustbin.id)
    try {
      await app.deleteDustbin(dustbin.id)
      setSelectedId('')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">My Dustbins</span>
          <h1>Register dustbins and link them to manually weighed plastic lots.</h1>
          <p>Dustbins organize locations and plastic type support. Lot weights are still entered manually when publishing.</p>
        </div>
        <button className="btn primary" type="button" onClick={openNew}>
          Add dustbin
        </button>
      </section>

      {app.dustbins.length > 0 ? (
        <section className="detail-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Registered</span>
                <h3>{filteredDustbins.length} dustbins</h3>
              </div>
            </div>
            <div className="dustbin-list">
              {filteredDustbins.map((dustbin) => (
                <button
                  className={`dustbin-card ${selected?.id === dustbin.id ? 'active' : ''}`}
                  key={dustbin.id}
                  type="button"
                  onClick={() => setSelectedId(dustbin.id)}
                >
                  <MaterialBadge compact material={dustbin.supportedPlasticType} />
                  <span>
                    <strong>{dustbin.name}</strong>
                    <small>{dustbin.code} - {dustbin.locationAddress}</small>
                  </span>
                  <i className={`status ${dustbin.isActive ? 'online' : 'withdrawn'}`}>{dustbin.isActive ? 'active' : 'inactive'}</i>
                </button>
              ))}
            </div>
          </article>

          <article className="panel detail-panel">
            {selected ? (
              <>
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">Dustbin details</span>
                    <h3>{selected.name}</h3>
                  </div>
                  <span className={`status ${selected.isActive ? 'online' : 'withdrawn'}`}>{selected.isActive ? 'active' : 'inactive'}</span>
                </div>
                <div className="detail-list">
                  <span><b>Code</b>{selected.code}</span>
                  <span><b>Plastic type</b>{plasticMaterialLabel(selected.supportedPlasticType)}</span>
                  <span><b>Location</b>{selected.locationAddress}</span>
                  <span><b>Latitude</b>{selected.latitude}</span>
                  <span><b>Longitude</b>{selected.longitude}</span>
                  <span><b>Created</b>{dateLabel(selected.createdAt)}</span>
                  <span><b>Updated</b>{dateLabel(selected.updatedAt)}</span>
                </div>
                {selected.description ? <p className="page-note">{selected.description}</p> : null}
                <div className="detail-actions">
                  <button className="btn secondary" type="button" onClick={() => openEdit(selected)}>
                    Edit details
                  </button>
                  <button
                    className="btn secondary danger"
                    disabled={deletingId === selected.id}
                    type="button"
                    onClick={() => void deleteSelected(selected)}
                  >
                    {deletingId === selected.id ? 'Removing...' : 'Remove dustbin'}
                  </button>
                </div>
              </>
            ) : (
              <EmptyState title="No dustbin selected" body="Choose a dustbin to view its address, code, material support and dates." />
            )}
          </article>
        </section>
      ) : (
        <EmptyState title="No dustbins registered" body="Add your first dustbin before linking one to a plastic lot." />
      )}

      {isEditing ? (
        <section className="panel dustbin-form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{editingId ? 'Edit dustbin' : 'New dustbin'}</span>
              <h3>{editingId ? 'Update dustbin details' : 'Add a registered dustbin'}</h3>
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
              <span>Name or label</span>
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="field">
              <span>Dustbin code</span>
              <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </label>
            <label className="field full-span">
              <span>Location or address</span>
              <input required value={form.locationAddress} onChange={(event) => setForm({ ...form, locationAddress: event.target.value })} />
            </label>
            <label className="field">
              <span>Latitude</span>
              <input
                required
                step="0.0000001"
                type="number"
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                required
                step="0.0000001"
                type="number"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Supported plastic type</span>
              <select
                value={form.supportedPlasticType}
                onChange={(event) => setForm({ ...form, supportedPlasticType: event.target.value as DustbinFormInput['supportedPlasticType'] })}
              >
                {PLASTIC_MATERIAL_CODES.map((material) => (
                  <option key={material} value={material}>{plasticMaterialLabel(material)}</option>
                ))}
              </select>
            </label>
            <label className="toggle-row">
              <span>
                <strong>Active status</strong>
                <small>Inactive dustbins stay visible but cannot be linked to new lots.</small>
              </span>
              <input checked={form.isActive} type="checkbox" onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            </label>
            <label className="field full-span">
              <span>Description</span>
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <button className="btn primary full-span" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Save dustbin' : 'Add dustbin'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
