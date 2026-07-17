import type { CollectionPoint } from '../../types/domain'

interface PartnerCardProps {
  point: CollectionPoint
  isSaved: boolean
  onToggleSaved: (pointId: string) => void
}

export function PartnerCard({ point, isSaved, onToggleSaved }: PartnerCardProps) {
  return (
    <article className="partner">
      <span className="partner-logo">{point.initials}</span>
      <div>
        <strong>{point.name}</strong>
        <small>
          {point.supportedMaterials.join(', ')} - average {point.monthlyKg} kg/month
        </small>
      </div>
      <div className="score">
        <b>{point.reliabilityScore}%</b>
        <small>{point.rating.toFixed(1)} rating</small>
        <button className="text-btn" type="button" onClick={() => onToggleSaved(point.id)}>
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  )
}
