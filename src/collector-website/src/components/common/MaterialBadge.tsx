import type { PlasticMaterial } from '../../types/domain'

interface MaterialBadgeProps {
  material: PlasticMaterial
  compact?: boolean
}

const materialNumbers: Record<PlasticMaterial, string> = {
  PET: '1',
  HDPE: '2',
  PP: '5',
  LDPE: '4',
}

export function MaterialBadge({ material, compact = false }: MaterialBadgeProps) {
  return (
    <span className={`symbol ${material.toLowerCase()}`} aria-label={`${material} material`}>
      {compact ? material : materialNumbers[material]}
    </span>
  )
}
