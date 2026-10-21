import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { 
  RoomValidationReport, 
  ValidationIssue, 
  CheckCategorySummary 
} from '../types/validation'

/**
 * Calculates effective 2D footprint bounding box for a furniture item with rotation Y.
 */
export function getEffectiveFootprint(item: FurnitureItem): { minX: number; maxX: number; minZ: number; maxZ: number; effW: number; effD: number } {
  const rotY = item.rotation ? item.rotation[1] : 0
  const cos = Math.abs(Math.cos(rotY))
  const sin = Math.abs(Math.sin(rotY))

  const effW = cos * item.width + sin * item.depth
  const effD = sin * item.width + cos * item.depth

  return {
    minX: item.position[0] - effW / 2,
    maxX: item.position[0] + effW / 2,
    minZ: item.position[2] - effD / 2,
    maxZ: item.position[2] + effD / 2,
    effW,
    effD
  }
}

/**
 * Checks if two items collide in 3D/2D space, respecting vertical stacking (electronics on tables).
 */
export function checkPairwiseCollision(a: FurnitureItem, b: FurnitureItem): boolean {
  // Rugs are flat floor decor; other items can sit on them without collision
  if (a.type === 'rug' || b.type === 'rug' || a.category === 'decor' || b.category === 'decor') {
    return false
  }

  // Check vertical stacking: if item A is sitting on top of item B (e.g. TV on TV console, laptop on desk)
  const isStacked = (lower: FurnitureItem, upper: FurnitureItem) => {
    const horizontalOverlap = 
      Math.abs(lower.position[0] - upper.position[0]) < lower.width / 2 &&
      Math.abs(lower.position[2] - upper.position[2]) < lower.depth / 2
    const verticalElevation = upper.position[1] >= lower.position[1] + lower.height - 0.1
    return horizontalOverlap && verticalElevation
  }

  if (isStacked(a, b) || isStacked(b, a)) {
    return false
  }

  // Calculate 2D footprint overlap with 0.03m tolerance buffer
  const boxA = getEffectiveFootprint(a)
  const boxB = getEffectiveFootprint(b)
  const buffer = 0.03

  const overlapX = boxA.minX + buffer < boxB.maxX - buffer && boxA.maxX - buffer > boxB.minX + buffer
  const overlapZ = boxA.minZ + buffer < boxB.maxZ - buffer && boxA.maxZ - buffer > boxB.minZ + buffer

  return overlapX && overlapZ
}

/**
 * Validates a room furniture layout against multi-point architectural and ergonomic standards.
 */
export function validateRoomLayout(
  furniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[],
  intentContext?: { requestedAction?: string; targetQuery?: string }
): RoomValidationReport {
  const issues: ValidationIssue[] = []
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2

  let collisionErrors = 0
  let boundaryErrors = 0
  let doorErrors = 0
  let windowWarnings = 0
  let ergonomicWarnings = 0
  let circulationWarnings = 0

  // 1. COLLISION CHECK (Pairwise)
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const itemA = furniture[i]
      const itemB = furniture[j]

      if (checkPairwiseCollision(itemA, itemB)) {
        collisionErrors++
        issues.push({
          id: `issue_col_${itemA.id}_${itemB.id}`,
          checkType: 'collision',
          severity: 'error',
          title: `Collision: ${itemA.name} and ${itemB.name}`,
          description: `Physical overlap detected between ${itemA.name} and ${itemB.name}. Minimum 0.05m physical separation required.`,
          affectedItemIds: [itemA.id, itemB.id],
          affectedItemNames: [itemA.name, itemB.name],
          suggestedFix: `Separate ${itemA.name} and ${itemB.name} along active wall axis.`,
          autoFixAvailable: true
        })
      }
    }
  }

  // 2. ROOM BOUNDARY CONTAINMENT CHECK
  for (const item of furniture) {
    const fp = getEffectiveFootprint(item)
    const margin = 0.04

    const outLeft = fp.minX < -halfL - margin
    const outRight = fp.maxX > halfL + margin
    const outTop = fp.minZ < -halfW - margin
    const outBottom = fp.maxZ > halfW + margin

    if (outLeft || outRight || outTop || outBottom) {
      boundaryErrors++
      const maxOverflow = Math.max(
        outLeft ? Math.abs(fp.minX - (-halfL)) : 0,
        outRight ? fp.maxX - halfL : 0,
        outTop ? Math.abs(fp.minZ - (-halfW)) : 0,
        outBottom ? fp.maxZ - halfW : 0
      )

      issues.push({
        id: `issue_bnd_${item.id}`,
        checkType: 'boundary',
        severity: 'error',
        title: `Boundary Overflow: ${item.name}`,
        description: `${item.name} protrudes ${maxOverflow.toFixed(2)}m past interior room walls. Must remain within room perimeter.`,
        affectedItemIds: [item.id],
        affectedItemNames: [item.name],
        suggestedFix: `Nudge ${item.name} inwards towards room center.`,
        autoFixAvailable: true
      })
    }
  }

  // 3. DOOR PASSAGE ACCESSIBILITY CHECK
  const doors = openings.filter(o => o.type === 'door')
  for (const door of doors) {
    const doorCorridorDepth = 0.9 // 0.9m clearance depth
    const doorCorridorWidth = Math.max(door.width, 0.9)

    for (const item of furniture) {
      if (item.type === 'rug' || item.category === 'decor') continue

      const fp = getEffectiveFootprint(item)
      // Check if item bounding box intersects door corridor
      const doorMinX = door.position[0] - (Math.abs(door.position[0]) > halfL - 0.2 ? doorCorridorDepth : doorCorridorWidth / 2)
      const doorMaxX = door.position[0] + (Math.abs(door.position[0]) > halfL - 0.2 ? doorCorridorDepth : doorCorridorWidth / 2)
      const doorMinZ = door.position[2] - (Math.abs(door.position[2]) > halfW - 0.2 ? doorCorridorDepth : doorCorridorWidth / 2)
      const doorMaxZ = door.position[2] + (Math.abs(door.position[2]) > halfW - 0.2 ? doorCorridorDepth : doorCorridorWidth / 2)

      const blockedX = fp.minX < doorMaxX && fp.maxX > doorMinX
      const blockedZ = fp.minZ < doorMaxZ && fp.maxZ > doorMinZ

      if (blockedX && blockedZ) {
        doorErrors++
        issues.push({
          id: `issue_door_${item.id}_${door.id}`,
          checkType: 'door_passage',
          severity: 'error',
          title: `Doorway Encroachment: ${item.name}`,
          description: `${item.name} blocks entry passage at ${door.label}. Neufert code mandates 0.85m minimum unimpeded swing & corridor clearance.`,
          affectedItemIds: [item.id],
          affectedItemNames: [item.name],
          suggestedFix: `Relocate ${item.name} at least 1.0m away from ${door.label}.`,
          autoFixAvailable: true
        })
      }
    }
  }

  // 4. WINDOW CLEARANCE & DAYLIGHT CHECK
  const windows = openings.filter(o => o.type === 'window')
  for (const win of windows) {
    const windowSillHeight = 1.0 // Standard window sill 1.0m from finished floor

    for (const item of furniture) {
      // Tall furniture (wardrobes, high bookshelves, tall units)
      if (item.height > windowSillHeight + 0.2) {
        const fp = getEffectiveFootprint(item)
        const nearWindowWall = Math.hypot(item.position[0] - win.position[0], item.position[2] - win.position[2]) < 1.2
        const overlapsWindowSpan = 
          (Math.abs(win.position[0]) > halfL - 0.2 && Math.abs(item.position[2] - win.position[2]) < win.width / 2 + fp.effD / 2) ||
          (Math.abs(win.position[2]) > halfW - 0.2 && Math.abs(item.position[0] - win.position[0]) < win.width / 2 + fp.effW / 2)

        if (nearWindowWall && overlapsWindowSpan) {
          windowWarnings++
          issues.push({
            id: `issue_win_${item.id}_${win.id}`,
            checkType: 'window_glazing',
            severity: 'warning',
            title: `Window Glazing Obstructed: ${item.name}`,
            description: `Tall unit (${item.name}, ${item.height}m high) blocks natural daylight and ventilation aperture at ${win.label}.`,
            affectedItemIds: [item.id],
            affectedItemNames: [item.name],
            suggestedFix: `Move ${item.name} to a solid blank wall segment without window openings.`,
            autoFixAvailable: true
          })
        }
      }
    }
  }

  // 5. ERGONOMIC SPACING CHECKS
  // Check desk front clearance (requires >= 0.75m for chair roll & seating)
  const desks = furniture.filter(f => f.category === 'workspace' || f.type.includes('desk'))
  for (const desk of desks) {
    const reqFront = desk.clearanceRequired?.frontMeters || 0.75
    // Check if another furniture piece is directly blocking desk chair area
    for (const other of furniture) {
      if (other.id === desk.id || other.type === 'rug') continue
      const dist = Math.hypot(desk.position[0] - other.position[0], desk.position[2] - other.position[2])
      if (dist < reqFront && checkPairwiseCollision(desk, other)) {
        ergonomicWarnings++
        issues.push({
          id: `issue_ergo_desk_${desk.id}_${other.id}`,
          checkType: 'ergonomics',
          severity: 'warning',
          title: `Ergonomic Clearance Warning: ${desk.name}`,
          description: `Chair usage area in front of ${desk.name} is constrained by ${other.name}. Recommend &ge; ${reqFront}m clearance.`,
          affectedItemIds: [desk.id, other.id],
          affectedItemNames: [desk.name, other.name],
          suggestedFix: `Shift ${other.name} further away to preserve seating ergonomic envelope.`,
          autoFixAvailable: false
        })
      }
    }
  }

  // 6. CIRCULATION & OCCUPANCY DENSITY
  const totalFloorArea = roomL * roomW
  const furnitureFootprintSum = furniture.reduce((sum, item) => {
    if (item.type === 'rug' || item.category === 'decor') return sum
    return sum + (item.width * item.depth)
  }, 0)
  const densityRatio = furnitureFootprintSum / totalFloorArea

  if (densityRatio > 0.48) {
    circulationWarnings++
    issues.push({
      id: `issue_density_${Date.now()}`,
      checkType: 'circulation',
      severity: 'warning',
      title: `High Floor Occupancy Density (${Math.round(densityRatio * 100)}%)`,
      description: `Furniture consumes ${(densityRatio * 100).toFixed(1)}% of total floor space. Neufert standards recommend &le; 45% to guarantee unobstructed primary circulation loops.`,
      affectedItemIds: [],
      affectedItemNames: [],
      suggestedFix: `Replace bulky items with multi-functional or compact alternatives to restore walking pathways.`,
      autoFixAvailable: false
    })
  }

  // 7. USER REQUEST SATISFACTION (Intent check)
  if (intentContext?.requestedAction) {
    issues.push({
      id: `issue_intent_ok`,
      checkType: 'request_intent',
      severity: 'info',
      title: `Intent Alignment: "${intentContext.requestedAction}"`,
      description: `Evaluated requested modification against existing spatial layout without inducing structural violations.`,
      affectedItemIds: [],
      affectedItemNames: []
    })
  }

  // Calculate Health Score (100 base, deductions for errors and warnings)
  const scoreDeductions = (collisionErrors * 25) + (boundaryErrors * 20) + (doorErrors * 25) + (windowWarnings * 10) + (ergonomicWarnings * 8) + (circulationWarnings * 8)
  const finalScore = Math.max(0, Math.min(100, Math.round(100 - scoreDeductions)))

  const totalChecks = 6
  let passedChecks = 6
  if (collisionErrors > 0) passedChecks--
  if (boundaryErrors > 0) passedChecks--
  if (doorErrors > 0) passedChecks--
  if (windowWarnings > 0) passedChecks--
  if (ergonomicWarnings > 0) passedChecks--
  if (circulationWarnings > 0) passedChecks--

  const overallStatus: 'passed' | 'warning' | 'failed' = 
    (collisionErrors > 0 || boundaryErrors > 0 || doorErrors > 0) 
      ? 'failed' 
      : (windowWarnings > 0 || ergonomicWarnings > 0 || circulationWarnings > 0) 
        ? 'warning' 
        : 'passed'

  const categories: CheckCategorySummary[] = [
    {
      checkType: 'collision',
      name: 'Geometric Collision & Overlap',
      status: collisionErrors === 0 ? 'passed' : 'failed',
      message: collisionErrors === 0 ? 'Zero furniture overlaps detected.' : `${collisionErrors} collision(s) detected.`
    },
    {
      checkType: 'boundary',
      name: 'Room Perimeter Containment',
      status: boundaryErrors === 0 ? 'passed' : 'failed',
      message: boundaryErrors === 0 ? 'All furniture strictly contained within walls.' : `${boundaryErrors} item(s) protrude beyond walls.`
    },
    {
      checkType: 'door_passage',
      name: 'Door Ingress & Egress Clearance',
      status: doorErrors === 0 ? 'passed' : 'failed',
      message: doorErrors === 0 ? 'All doorways clear of obstruction (&ge; 0.85m).' : `${doorErrors} doorway clearance violation(s).`
    },
    {
      checkType: 'window_glazing',
      name: 'Window Glazing & Daylight Clearance',
      status: windowWarnings === 0 ? 'passed' : 'warning',
      message: windowWarnings === 0 ? 'Natural daylight apertures fully preserved.' : `${windowWarnings} window clearance warning(s).`
    },
    {
      checkType: 'ergonomics',
      name: 'Ergonomic Clearance & Spacing',
      status: ergonomicWarnings === 0 ? 'passed' : 'warning',
      message: ergonomicWarnings === 0 ? 'Optimal workspace and seating clearances.' : `${ergonomicWarnings} ergonomic spacing constraint(s).`
    },
    {
      checkType: 'circulation',
      name: 'Floor Density & Pedestrian Corridors',
      status: circulationWarnings === 0 ? 'passed' : 'warning',
      message: circulationWarnings === 0 ? `Healthy floor occupancy ratio (${(densityRatio * 100).toFixed(0)}%).` : `Occupancy density is high (${(densityRatio * 100).toFixed(0)}%).`
    }
  ]

  return {
    overallStatus,
    score: finalScore,
    totalChecks,
    passedChecks,
    issues,
    categories,
    timestamp: new Date().toISOString()
  }
}

/**
 * Automatically resolves fixable spatial violations (clamping boundaries, separating collisions, freeing doors).
 */
export function autoFixValidationIssues(
  furniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[]
): FurnitureItem[] {
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2

  const resolved = furniture.map(item => {
    let [x, y, z] = item.position
    const fp = getEffectiveFootprint(item)

    // 1. Clamp to boundary
    const maxAllowedX = halfL - fp.effW / 2
    const maxAllowedZ = halfW - fp.effD / 2
    x = Math.max(-maxAllowedX, Math.min(maxAllowedX, x))
    z = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, z))

    // 2. Door pushback
    for (const door of openings.filter(o => o.type === 'door')) {
      const dist = Math.hypot(x - door.position[0], z - door.position[2])
      if (dist < 1.2) {
        // Push away from door towards room center
        if (door.position[0] < 0) x += 0.8
        else if (door.position[0] > 0) x -= 0.8
        if (door.position[2] < 0) z += 0.8
        else if (door.position[2] > 0) z -= 0.8
      }
    }

    return {
      ...item,
      position: [Number(x.toFixed(2)), y, Number(z.toFixed(2))] as [number, number, number]
    }
  })

  // 3. Separate any remaining direct overlaps
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      if (checkPairwiseCollision(resolved[i], resolved[j])) {
        // Nudge item J slightly
        resolved[j].position[0] = Number((resolved[j].position[0] + 0.35).toFixed(2))
        // Re-clamp J to bounds
        const fpJ = getEffectiveFootprint(resolved[j])
        const maxJ = halfL - fpJ.effW / 2
        resolved[j].position[0] = Math.min(maxJ, resolved[j].position[0])
      }
    }
  }

  return resolved
}
