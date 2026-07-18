import type { PlasticMaterial } from '../../types/domain'
import { PLASTIC_MATERIAL_NUMBERS } from '../../../config/plasticMaterials'

interface MaterialBadgeProps {
  material: PlasticMaterial
  compact?: boolean
}

export function MaterialBadge({ material, compact = false }: MaterialBadgeProps) {
  return (
    <span className={`symbol ${material.toLowerCase()}`} aria-label={`${material} material`}>
      {compact ? material : PLASTIC_MATERIAL_NUMBERS[material]}
    </span>
  )
}
