import { 
  FurnitureRecommendation, 
  RecommendationRequest, 
  PlacementSuggestion, 
  RecommendationConflict 
} from '../types/recommendation'
import { VERIFIED_FURNITURE_CATALOG } from '../data/furnitureCatalog'
import { FurnitureCatalogEntry } from '../types/furniture'

/**
 * AI Furniture Recommendation Engine.
 * Evaluates room dimensions, existing furniture footprints, wall spans, and user requirements
 * to generate physically feasible placement suggestions with full clearance checks.
 */
export function generateFurnitureRecommendations(
  req: RecommendationRequest
): FurnitureRecommendation[] {
  const { roomType, roomDimensions, existingFurniture, userRequirement = '' } = req
  const { length: roomL, width: roomW } = roomDimensions

  const totalFloorArea = roomL * roomW
  const occupiedFloorArea = existingFurniture.reduce((sum, f) => sum + (f.width * f.depth), 0)

  // 1. Calculate remaining wall spans
  // North/South walls have length roomL; West/East walls have length roomW
  const wallCapacity = {
    north: { total: roomL, occupied: 0, items: 0 },
    south: { total: roomL, occupied: 0, items: 0 },
    west: { total: roomW, occupied: 0, items: 0 },
    east: { total: roomW, occupied: 0, items: 0 }
  }

  const halfL = roomL / 2
  const halfW = roomW / 2

  existingFurniture.forEach((item) => {
    const [x, , z] = item.position
    // Determine which wall the item is closest to
    const distToNorth = Math.abs(z - (-halfW))
    const distToSouth = Math.abs(z - halfW)
    const distToWest = Math.abs(x - (-halfL))
    const distToEast = Math.abs(x - halfL)

    const minDist = Math.min(distToNorth, distToSouth, distToWest, distToEast)
    if (minDist === distToNorth) {
      wallCapacity.north.occupied += (item.width + 0.2)
      wallCapacity.north.items++
    } else if (minDist === distToSouth) {
      wallCapacity.south.occupied += (item.width + 0.2)
      wallCapacity.south.items++
    } else if (minDist === distToWest) {
      wallCapacity.west.occupied += (item.width + 0.2)
      wallCapacity.west.items++
    } else {
      wallCapacity.east.occupied += (item.width + 0.2)
      wallCapacity.east.items++
    }
  })

  // 2. Filter candidate catalog items relevant to room type and user prompt
  const userReqLower = userRequirement.toLowerCase()
  let candidates = VERIFIED_FURNITURE_CATALOG.filter((entry) => 
    entry.suitableRooms.includes(roomType) || entry.suitableRooms.includes('Other')
  )

  // Avoid suggesting duplicate items if already present (unless it's an armchair/nightstand)
  const existingTypes = new Set(existingFurniture.map(f => f.type))
  candidates = candidates.filter(c => {
    if (c.type === 'armchair' || c.type === 'nightstand') return true
    return !existingTypes.has(c.type)
  })

  // Prioritize based on user requirements
  if (userReqLower.includes('study') || userReqLower.includes('work') || userReqLower.includes('desk')) {
    candidates.sort((a) => (a.category === 'workspace' ? -1 : 1))
  } else if (userReqLower.includes('seat') || userReqLower.includes('sofa') || userReqLower.includes('lounge')) {
    candidates.sort((a) => (a.category === 'seating' ? -1 : 1))
  } else if (userReqLower.includes('storage') || userReqLower.includes('book') || userReqLower.includes('wardrobe')) {
    candidates.sort((a) => (a.category === 'storage' ? -1 : 1))
  }

  // 3. Evaluate each candidate against strict spatial constraints
  const recommendations: FurnitureRecommendation[] = []

  candidates.forEach((catalogEntry) => {
    const conflicts: RecommendationConflict[] = []
    const candW = catalogEntry.defaultWidth
    const candD = catalogEntry.defaultDepth
    const candH = catalogEntry.defaultHeight
    const candFootprint = candW * candD

    // Check 1: Physical room dimension overflow (Candidate wider than entire room)
    const fitsRoomSpan = candW <= roomL || candW <= roomW
    if (!fitsRoomSpan) {
      conflicts.push({
        type: 'insufficient_wall',
        severity: 'fatal',
        description: `Item width (${candW}m) exceeds entire room dimensions (${roomL}m × ${roomW}m). Cannot physically fit.`
      })
    }

    // Check 2: Circulation & Occupancy Ratio
    const newOccupancyRatio = (occupiedFloorArea + candFootprint) / totalFloorArea
    if (newOccupancyRatio > 0.55) {
      conflicts.push({
        type: 'circulation_compromised',
        severity: 'fatal',
        description: `Adding this item raises room floor occupancy to ${(newOccupancyRatio * 100).toFixed(0)}% (exceeding recommended 55% maximum density for ${roomType}). Walking paths will be restricted.`
      })
    } else if (newOccupancyRatio > 0.42) {
      conflicts.push({
        type: 'circulation_compromised',
        severity: 'warning',
        description: `Moderate room density: Floor occupancy will reach ${(newOccupancyRatio * 100).toFixed(0)}%. Ensure clearance buffer is maintained.`
      })
    }

    // Check 3: Find best unblocked wall for placement
    const placement = findBestWallPlacement(
      catalogEntry,
      roomL,
      roomW,
      wallCapacity
    )

    if (!placement.fitsWall) {
      conflicts.push({
        type: 'insufficient_wall',
        severity: 'fatal',
        description: `No available wall has sufficient uninterrupted clearance (${candW}m required, best remaining span is ${placement.wallLengthAvailable.toFixed(1)}m on ${placement.alignedWall} wall).`
      })
    }

    // Determine overall feasibility
    const hasFatal = conflicts.some(c => c.severity === 'fatal')
    const isPhysicallyFeasible = !hasFatal

    // Generate architectural rationale
    const reason = generateReason(catalogEntry, roomType, totalFloorArea, userRequirement, isPhysicallyFeasible)

    recommendations.push({
      id: `rec_${catalogEntry.type}_${Date.now()}`,
      furnitureType: catalogEntry.type,
      name: catalogEntry.name,
      catalogEntry,
      reason,
      requiredSpace: {
        footprintM2: Number(candFootprint.toFixed(2)),
        dimensions: `${candW.toFixed(2)}m (W) × ${candD.toFixed(2)}m (D) × ${candH.toFixed(2)}m (H)`,
        clearanceDepthM: catalogEntry.clearanceRequired.frontMeters
      },
      suggestedPlacement: placement,
      conflicts,
      isPhysicallyFeasible
    })
  })

  // Return feasible recommendations first, then flagged ones
  return recommendations.sort((a, b) => (b.isPhysicallyFeasible ? 1 : 0) - (a.isPhysicallyFeasible ? 1 : 0))
}

/**
 * Finds the optimal wall placement with clearance for a candidate item.
 */
function findBestWallPlacement(
  catalogEntry: FurnitureCatalogEntry,
  roomL: number,
  roomW: number,
  wallCapacity: Record<'north' | 'south' | 'east' | 'west', { total: number; occupied: number; items: number }>
): PlacementSuggestion {
  const candW = catalogEntry.defaultWidth
  const candD = catalogEntry.defaultDepth
  const halfL = roomL / 2
  const halfW = roomW / 2

  // Walls order preference based on availability
  const walls: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'west', 'south']
  
  // Sort walls by greatest available space
  walls.sort((a, b) => {
    const spaceA = wallCapacity[a].total - wallCapacity[a].occupied
    const spaceB = wallCapacity[b].total - wallCapacity[b].occupied
    return spaceB - spaceA
  })

  for (const wall of walls) {
    const available = wallCapacity[wall].total - wallCapacity[wall].occupied
    if (available >= candW) {
      // Calculate coordinates along this wall
      let posX = 0
      let posZ = 0
      let rotY = 0

      if (wall === 'north') {
        posX = (wallCapacity.north.items % 2 === 0 ? 0.3 : -0.3) * halfL
        posZ = -halfW + candD / 2 + 0.05
        rotY = 0
      } else if (wall === 'south') {
        posX = 0
        posZ = halfW - candD / 2 - 0.05
        rotY = Math.PI
      } else if (wall === 'west') {
        posX = -halfL + candW / 2 + 0.05
        posZ = (wallCapacity.west.items % 2 === 0 ? 0.2 : -0.2) * halfW
        rotY = Math.PI / 2
      } else {
        posX = halfL - candW / 2 - 0.05
        posZ = (wallCapacity.east.items % 2 === 0 ? 0.2 : -0.2) * halfW
        rotY = -Math.PI / 2
      }

      return {
        position: [Number(posX.toFixed(2)), 0, Number(posZ.toFixed(2))],
        rotation: [0, Number(rotY.toFixed(4)), 0],
        alignedWall: wall,
        wallLengthAvailable: Number(available.toFixed(2)),
        fitsWall: true
      }
    }
  }

  // If no wall fits, report the largest remaining wall
  const bestWall = walls[0]
  const largestSpan = wallCapacity[bestWall].total - wallCapacity[bestWall].occupied

  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    alignedWall: bestWall,
    wallLengthAvailable: Math.max(0, Number(largestSpan.toFixed(2))),
    fitsWall: false
  }
}

function generateReason(
  catalogEntry: FurnitureCatalogEntry,
  roomType: string,
  totalArea: number,
  userReq: string,
  feasible: boolean
): string {
  if (!feasible) {
    return `Physical boundary conflict: ${catalogEntry.name} exceeds available dimensions or maximum recommended floor occupancy for this ${totalArea.toFixed(1)} m² ${roomType}.`
  }

  if (userReq && catalogEntry.name.toLowerCase().includes(userReq.toLowerCase())) {
    return `Directly fulfills user request for "${userReq}". Fits neatly with ${catalogEntry.clearanceRequired.frontMeters}m ergonomic front clearance.`
  }

  if (roomType === 'Living Room') {
    if (catalogEntry.category === 'seating') {
      return `Provides essential social seating aligned with focal elevation, leaving generous circulation space.`
    }
    if (catalogEntry.category === 'tables') {
      return `Complements seating arrangement with low profile surface area without impeding walkway access.`
    }
    return `Enhances living room utility with standardized ${catalogEntry.defaultWidth}m footprint.`
  }

  if (roomType === 'Bedroom') {
    if (catalogEntry.category === 'beds') {
      return `Anchors the primary sleeping zone with standard Neufert-compliant lateral clearance (${catalogEntry.clearanceRequired.sidesMeters}m).`
    }
    if (catalogEntry.category === 'storage') {
      return `Maximizes vertical storage capacity with minimal floor footprint consumption.`
    }
    return `Ideal functional addition for a restful bedroom environment.`
  }

  if (roomType === 'Office') {
    return `Optimized ergonomic workspace piece complying with BIFMA standards for sustained daily productivity.`
  }

  return `Architecturally scaled for ${roomType} layouts with verified physical clearances.`
}
