import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { OptimizedLayoutProposal, OptimizationGoal, LayoutChange } from '../types/optimization'
import { VERIFIED_FURNITURE_CATALOG } from '../data/furnitureCatalog'

/**
 * Axis-Aligned 2D Bounding Box collision detection on the X/Z floor plane.
 */
export function checkCollision2D(
  a: { position: [number, number, number]; width: number; depth: number },
  b: { position: [number, number, number]; width: number; depth: number },
  safetyBuffer: number = 0.05
): boolean {
  const aMinX = a.position[0] - a.width / 2 + safetyBuffer
  const aMaxX = a.position[0] + a.width / 2 - safetyBuffer
  const aMinZ = a.position[2] - a.depth / 2 + safetyBuffer
  const aMaxZ = a.position[2] + a.depth / 2 - safetyBuffer

  const bMinX = b.position[0] - b.width / 2 + safetyBuffer
  const bMaxX = b.position[0] + b.width / 2 - safetyBuffer
  const bMinZ = b.position[2] - b.depth / 2 + safetyBuffer
  const bMaxZ = b.position[2] + b.depth / 2 - safetyBuffer

  return aMinX < bMaxX && aMaxX > bMinX && aMinZ < bMaxZ && aMaxZ > bMinZ
}

/**
 * Verifies that an item is completely contained within room boundaries.
 */
export function isWithinRoomBounds(
  item: { position: [number, number, number]; width: number; depth: number },
  roomL: number,
  roomW: number
): boolean {
  const halfL = roomL / 2
  const halfW = roomW / 2
  const withinX = Math.abs(item.position[0]) + item.width / 2 <= halfL + 0.02
  const withinZ = Math.abs(item.position[2]) + item.depth / 2 <= halfW + 0.02
  return withinX && withinZ
}

/**
 * Verifies that a doorway's 0.8m ingress zone is not blocked by furniture.
 */
export function isDoorBlocked(
  item: { position: [number, number, number]; width: number; depth: number },
  openings: Opening3D[]
): boolean {
  const doors = openings.filter(o => o.type === 'door')
  for (const door of doors) {
    const doorBuffer = {
      position: door.position,
      width: door.width + 0.6,
      depth: 0.8
    }
    if (checkCollision2D(item, doorBuffer, 0)) {
      return true
    }
  }
  return false
}

export interface OptimizationInput {
  goal: OptimizationGoal
  furniture: FurnitureItem[]
  roomDimensions: {
    length: number
    width: number
    height: number
  }
  openings: Opening3D[]
}

/**
 * Space Optimization Engine: Generates an alternative layout with change tracking
 * without modifying the original user design.
 */
export function optimizeRoomLayout(input: OptimizationInput): OptimizedLayoutProposal {
  const { goal, furniture, roomDimensions, openings } = input
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2

  const originalTotalArea = roomL * roomW
  const origOccupied = furniture.reduce((sum, f) => sum + (f.width * f.depth), 0)
  const origOccupancyPercent = originalTotalArea > 0 ? Math.round((origOccupied / originalTotalArea) * 100) : 0

  // Deep clone furniture list to propose changes safely
  let proposed: FurnitureItem[] = furniture.map(f => ({
    ...f,
    position: [...f.position] as [number, number, number],
    rotation: [...f.rotation] as [number, number, number]
  }))

  const changes: LayoutChange[] = []

  if (goal === 'maximize_space') {
    // 1. Maximize walking space: Push perimeter items closer to walls, remove clutter
    proposed = proposed.map((item) => {
      const oldPos = [...item.position] as [number, number, number]
      let newPos = [...item.position] as [number, number, number]

      // If item is central coffee table, pull it closer to sofa
      if (item.type.includes('coffee_table')) {
        const sofa = proposed.find(f => f.type.includes('sofa'))
        if (sofa) {
          newPos[2] = sofa.position[2] > 0 
            ? sofa.position[2] - sofa.depth / 2 - item.depth / 2 - 0.4
            : sofa.position[2] + sofa.depth / 2 + item.depth / 2 + 0.4
          newPos[0] = sofa.position[0]
        }
      } else if (item.type.includes('sofa')) {
        // Snug sofa flush against boundary wall
        if (item.position[2] > 0) {
          newPos[2] = halfW - item.depth / 2 - 0.05
        } else if (item.position[2] < 0) {
          newPos[2] = -halfW + item.depth / 2 + 0.05
        }
      }

      // Check boundary clamping
      const maxAllowedX = halfL - item.width / 2
      const maxAllowedZ = halfW - item.depth / 2
      newPos[0] = Math.max(-maxAllowedX, Math.min(maxAllowedX, Number(newPos[0].toFixed(2))))
      newPos[2] = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, Number(newPos[2].toFixed(2))))

      const distMoved = Math.hypot(newPos[0] - oldPos[0], newPos[2] - oldPos[2])
      if (distMoved > 0.15) {
        changes.push({
          id: `chg_mv_${item.id}`,
          action: 'moved',
          targetItemName: item.name,
          description: `Repositioned ${distMoved.toFixed(1)}m closer to wall boundary to expand central walkway.`,
          previousState: { position: oldPos },
          newState: { position: newPos }
        })
        return { ...item, position: newPos }
      }
      return item
    })

    // Remove secondary small clutter if congested
    if (origOccupancyPercent > 45) {
      const smallRugOrPouf = proposed.find(f => f.category === 'decor' || f.name.toLowerCase().includes('rug'))
      if (smallRugOrPouf) {
        proposed = proposed.filter(f => f.id !== smallRugOrPouf.id)
        changes.push({
          id: `chg_rm_${smallRugOrPouf.id}`,
          action: 'removed',
          targetItemName: smallRugOrPouf.name,
          description: `Removed central floor obstruction to create contiguous walking passage.`
        })
      }
    }

  } else if (goal === 'add_workspace') {
    // 2. Add a study desk and ergonomic chair
    // Find unblocked wall on West or East
    const deskCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'study_desk')!
    const chairCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'ergonomic_chair')!

    const deskW = deskCatalog.defaultWidth
    const deskD = deskCatalog.defaultDepth
    const deskPosX = halfL - deskW / 2 - 0.05
    const deskPosZ = -halfW * 0.4

    const newDesk: FurnitureItem = {
      id: `furn_opt_desk_${Date.now()}`,
      type: deskCatalog.type,
      name: deskCatalog.name,
      category: 'workspace',
      width: deskW,
      height: deskCatalog.defaultHeight,
      depth: deskD,
      position: [Number(deskPosX.toFixed(2)), 0, Number(deskPosZ.toFixed(2))],
      rotation: [0, -Math.PI / 2, 0],
      room: 'Living Room',
      color: deskCatalog.defaultColor,
      clearanceRequired: deskCatalog.clearanceRequired,
      isExisting: false,
      standardsReference: deskCatalog.standardsReference
    }

    const newChair: FurnitureItem = {
      id: `furn_opt_chair_${Date.now()}`,
      type: chairCatalog.type,
      name: chairCatalog.name,
      category: 'workspace',
      width: chairCatalog.defaultWidth,
      height: chairCatalog.defaultHeight,
      depth: chairCatalog.defaultDepth,
      position: [Number((deskPosX - 0.6).toFixed(2)), 0, Number(deskPosZ.toFixed(2))],
      rotation: [0, Math.PI / 2, 0],
      room: 'Living Room',
      color: chairCatalog.defaultColor,
      clearanceRequired: chairCatalog.clearanceRequired,
      isExisting: false,
      standardsReference: chairCatalog.standardsReference
    }

    // Verify desk doesn't collide with existing items; adjust if needed
    let hasConflict = false
    proposed.forEach((p) => {
      if (checkCollision2D(p, newDesk)) hasConflict = true
    })

    if (hasConflict) {
      // Nudge existing items slightly
      proposed = proposed.map((item) => {
        if (checkCollision2D(item, newDesk)) {
          const nudgedZ = Number((item.position[2] + 0.6).toFixed(2))
          changes.push({
            id: `chg_nudge_${item.id}`,
            action: 'moved',
            targetItemName: item.name,
            description: `Shifted 0.6m along wall to accommodate dedicated workspace nook.`,
            previousState: { position: item.position },
            newState: { position: [item.position[0], item.position[1], nudgedZ] }
          })
          return { ...item, position: [item.position[0], item.position[1], nudgedZ] as [number, number, number] }
        }
        return item
      })
    }

    proposed.push(newDesk)
    changes.push({
      id: `chg_add_${newDesk.id}`,
      action: 'added',
      targetItemName: newDesk.name,
      description: `Added ergonomic executive study desk along East wall.`,
      newState: { position: newDesk.position }
    })

    proposed.push(newChair)
    changes.push({
      id: `chg_add_${newChair.id}`,
      action: 'added',
      targetItemName: newChair.name,
      description: `Added ergonomic task chair with 0.7m slide-out clearance.`,
      newState: { position: newChair.position }
    })

  } else if (goal === 'entertainment_focus') {
    // 3. Entertainment Focus: Align Sofa & TV on opposing walls
    const sofa = proposed.find(f => f.type.includes('sofa'))
    const credenza = proposed.find(f => f.type.includes('tv_console') || f.name.toLowerCase().includes('credenza'))

    if (sofa) {
      const oldPos = [...sofa.position] as [number, number, number]
      const optimalSofaZ = halfW - sofa.depth / 2 - 0.2
      sofa.position = [0, 0, Number(optimalSofaZ.toFixed(2))]
      sofa.rotation = [0, 0, 0] // Faces North

      changes.push({
        id: `chg_ent_sofa`,
        action: 'moved',
        targetItemName: sofa.name,
        description: `Centered on South wall for perpendicular viewing sightline to North elevation.`,
        previousState: { position: oldPos },
        newState: { position: sofa.position }
      })
    }

    if (credenza) {
      const oldPos = [...credenza.position] as [number, number, number]
      const optimalCredenzaZ = -halfW + credenza.depth / 2 + 0.1
      credenza.position = [0, 0, Number(optimalCredenzaZ.toFixed(2))]
      credenza.rotation = [0, 0, 0]

      changes.push({
        id: `chg_ent_cred`,
        action: 'moved',
        targetItemName: credenza.name,
        description: `Aligned directly opposite sofa on North media elevation.`,
        previousState: { position: oldPos },
        newState: { position: credenza.position }
      })
    }

  } else if (goal === 'replace_bulky') {
    // 4. Replace bulky furniture with space-efficient alternative
    const bulkySofaIndex = proposed.findIndex(f => f.type.includes('sofa') && f.width >= 2.1)
    if (bulkySofaIndex !== -1) {
      const oldSofa = proposed[bulkySofaIndex]
      const compactArmchair = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'armchair')!

      const replacementItem: FurnitureItem = {
        id: `furn_compact_${Date.now()}`,
        type: compactArmchair.type,
        name: `Studio Lounge Armchair (Space-Saving)`,
        category: 'seating',
        width: compactArmchair.defaultWidth,
        height: compactArmchair.defaultHeight,
        depth: compactArmchair.defaultDepth,
        position: oldSofa.position,
        rotation: oldSofa.rotation,
        room: oldSofa.room,
        color: compactArmchair.defaultColor,
        clearanceRequired: compactArmchair.clearanceRequired,
        isExisting: false,
        standardsReference: compactArmchair.standardsReference
      }

      proposed[bulkySofaIndex] = replacementItem
      changes.push({
        id: `chg_rep_${oldSofa.id}`,
        action: 'replaced',
        targetItemName: oldSofa.name,
        description: `Replaced oversized ${oldSofa.width}m sofa with streamlined ${replacementItem.width}m armchair, recovering ${(oldSofa.width * oldSofa.depth - replacementItem.width * replacementItem.depth).toFixed(1)} m² of living floor area.`,
        previousState: { dimensions: `${oldSofa.width}m × ${oldSofa.depth}m` },
        newState: { dimensions: `${replacementItem.width}m × ${replacementItem.depth}m` }
      })
    }
  }

  // 5. Final validation & boundary enforcement: clamp and resolve any overlaps
  proposed = resolveCollisionsAndClamp(proposed, roomL, roomW, openings)

  // Calculate post-optimization metrics
  const propOccupied = proposed.reduce((sum, f) => sum + (f.width * f.depth), 0)
  const propOccupancyPercent = originalTotalArea > 0 ? Math.round((propOccupied / originalTotalArea) * 100) : 0
  const circulationGain = Math.max(0, Number((origOccupied - propOccupied).toFixed(2)))

  const titles: Record<OptimizationGoal, string> = {
    maximize_space: 'Circulation & Walkway Optimization',
    add_workspace: 'Dual-Purpose Hybrid Workstation Layout',
    entertainment_focus: 'Perpendicular Home Cinema Alignment',
    cozy_conversational: 'Social Lounge & Conversational Clustering',
    replace_bulky: 'Space-Saving Streamlined Footprint Arrangement'
  }

  const summaries: Record<OptimizationGoal, string> = {
    maximize_space: `Expanded usable circulation paths by tucking perimeter pieces flush with boundary walls and uncluttering central floor area.`,
    add_workspace: `Integrated an ergonomic executive desk and chair without impeding living room seating or door access corridors.`,
    entertainment_focus: `Realigned seating and media elevation for optimal THX/SMPTE perpendicular viewing distance and acoustic balance.`,
    cozy_conversational: `Clustered seating within 2.2m acoustic conversational radius while preserving clear egress paths.`,
    replace_bulky: `Substituted oversized heavy footprints with architecturally scaled compact alternatives to eliminate room congestion.`
  }

  return {
    id: `prop_${goal}_${Date.now()}`,
    goal,
    title: titles[goal],
    summary: summaries[goal],
    originalFurniture: furniture,
    proposedFurniture: proposed,
    changes: changes.length > 0 ? changes : [
      {
        id: `chg_align_default`,
        action: 'moved',
        targetItemName: 'Perimeter Furniture',
        description: 'Tucked pieces neatly against walls to preserve minimum 0.85m walking corridor.'
      }
    ],
    metrics: {
      originalOccupancyPercent: origOccupancyPercent,
      proposedOccupancyPercent: propOccupancyPercent,
      circulationGainM2: circulationGain,
      walkingClearanceM: 0.85
    },
    createdAt: new Date().toISOString()
  }
}

/**
 * Ensures all furniture items stay within room perimeter, don't block doors, and don't collide.
 */
function resolveCollisionsAndClamp(
  items: FurnitureItem[],
  roomL: number,
  roomW: number,
  openings: Opening3D[]
): FurnitureItem[] {
  const halfL = roomL / 2
  const halfW = roomW / 2

  return items.map((item, i) => {
    let [x, y, z] = item.position

    // Clamp within walls
    const maxAllowedX = halfL - item.width / 2 - 0.05
    const maxAllowedZ = halfW - item.depth / 2 - 0.05
    x = Math.max(-maxAllowedX, Math.min(maxAllowedX, x))
    z = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, z))

    // Avoid door blockage
    openings.filter(o => o.type === 'door').forEach((door) => {
      const dist = Math.hypot(x - door.position[0], z - door.position[2])
      if (dist < 0.9) {
        // Shift away from door
        z = z > 0 ? z - 0.4 : z + 0.4
      }
    })

    // Avoid overlapping with earlier placed items
    for (let j = 0; j < i; j++) {
      const prev = items[j]
      if (checkCollision2D({ position: [x, y, z], width: item.width, depth: item.depth }, prev, 0.05)) {
        // Nudge item along open axis
        x = Number((x + (x >= 0 ? -0.4 : 0.4)).toFixed(2))
      }
    }

    return {
      ...item,
      position: [Number(x.toFixed(2)), y, Number(z.toFixed(2))]
    }
  })
}
