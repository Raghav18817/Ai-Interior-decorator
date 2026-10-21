import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { checkPairwiseCollision, getEffectiveFootprint } from './changeValidationEngine'

export interface LiveConstraintStatus {
  isValid: boolean
  status: 'ok' | 'collision' | 'boundary' | 'door'
  message: string
}

/**
 * Checks live spatial constraints for a single furniture item against the current room layout.
 */
export function checkItemLiveConstraints(
  item: FurnitureItem,
  allFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number },
  openings: Opening3D[] = []
): LiveConstraintStatus {
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2
  const fp = getEffectiveFootprint(item)

  // 1. Boundary Check
  const margin = 0.02
  if (
    fp.minX < -halfL - margin || 
    fp.maxX > halfL + margin || 
    fp.minZ < -halfW - margin || 
    fp.maxZ > halfW + margin
  ) {
    return {
      isValid: false,
      status: 'boundary',
      message: 'Item protrudes outside room boundary'
    }
  }

  // 2. Door Blockage Check
  for (const door of openings.filter(o => o.type === 'door')) {
    const distToDoor = Math.hypot(item.position[0] - door.position[0], item.position[2] - door.position[2])
    if (distToDoor < 0.85) {
      return {
        isValid: false,
        status: 'door',
        message: `Encroaches door passage (${door.label})`
      }
    }
  }

  // 3. Collision Check against all other items
  for (const other of allFurniture) {
    if (other.id === item.id) continue
    if (checkPairwiseCollision(item, other)) {
      return {
        isValid: false,
        status: 'collision',
        message: `Colliding with ${other.name}`
      }
    }
  }

  return {
    isValid: true,
    status: 'ok',
    message: 'Placement code-compliant & clear'
  }
}

/**
 * Computes safe clamped floor coordinates from a continuous 2D floor plane drag position.
 */
export function calculateFloorDragPosition(
  targetPos: { x: number; z: number },
  item: FurnitureItem,
  roomDimensions: { length: number; width: number }
): [number, number, number] {
  const { length: roomL, width: roomW } = roomDimensions
  const fp = getEffectiveFootprint(item)
  const maxAllowedX = roomL / 2 - fp.effW / 2
  const maxAllowedZ = roomW / 2 - fp.effD / 2

  const clampedX = Math.max(-maxAllowedX, Math.min(maxAllowedX, targetPos.x))
  const clampedZ = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, targetPos.z))

  return [
    Number(clampedX.toFixed(2)),
    item.position[1],
    Number(clampedZ.toFixed(2))
  ]
}

/**
 * Calculates flush snap-to-wall positioning and orientation for an item.
 */
export function calculateSnapToWall(
  item: FurnitureItem,
  roomDimensions: { length: number; width: number }
): { position: [number, number, number]; rotation: [number, number, number]; wall: 'north' | 'south' | 'east' | 'west' } {
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2

  const distToEast = Math.abs(halfL - item.position[0])
  const distToWest = Math.abs(-halfL - item.position[0])
  const distToSouth = Math.abs(halfW - item.position[2])
  const distToNorth = Math.abs(-halfW - item.position[2])

  const minDist = Math.min(distToEast, distToWest, distToSouth, distToNorth)

  let wall: 'north' | 'south' | 'east' | 'west' = 'north'
  let newX = item.position[0]
  let newZ = item.position[2]
  let newRotY = 0

  if (minDist === distToNorth) {
    wall = 'north'
    newZ = -halfW + item.depth / 2 + 0.05
    newRotY = 0
  } else if (minDist === distToSouth) {
    wall = 'south'
    newZ = halfW - item.depth / 2 - 0.05
    newRotY = Math.PI
  } else if (minDist === distToEast) {
    wall = 'east'
    newX = halfL - item.depth / 2 - 0.05
    newRotY = -Math.PI / 2
  } else {
    wall = 'west'
    newX = -halfL + item.depth / 2 + 0.05
    newRotY = Math.PI / 2
  }

  // Bound check according to wall orientation
  const isNorthSouth = wall === 'north' || wall === 'south'
  const maxAllowedX = halfL - (isNorthSouth ? item.width : item.depth) / 2
  const maxAllowedZ = halfW - (isNorthSouth ? item.depth : item.width) / 2
  newX = Math.max(-maxAllowedX, Math.min(maxAllowedX, Number(newX.toFixed(2))))
  newZ = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, Number(newZ.toFixed(2))))

  return {
    position: [newX, item.position[1], newZ],
    rotation: [item.rotation[0], Number(newRotY.toFixed(4)), item.rotation[2]],
    wall
  }
}

/**
 * Creates a duplicate clone of a furniture piece with a unique ID and safe offset.
 */
export function duplicateFurnitureItem(
  item: FurnitureItem,
  roomDimensions: { length: number; width: number }
): FurnitureItem {
  const { length: roomL, width: roomW } = roomDimensions
  const maxAllowedX = roomL / 2 - item.width / 2
  const maxAllowedZ = roomW / 2 - item.depth / 2

  let nextX = item.position[0] + 0.35
  let nextZ = item.position[2] + 0.35

  if (nextX > maxAllowedX) nextX = item.position[0] - 0.35
  if (nextZ > maxAllowedZ) nextZ = item.position[2] - 0.35

  return {
    ...item,
    id: `furn_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${item.name} (Copy)`,
    position: [
      Number(nextX.toFixed(2)),
      item.position[1],
      Number(nextZ.toFixed(2))
    ],
    rotation: [...item.rotation] as [number, number, number],
    isExisting: false
  }
}
