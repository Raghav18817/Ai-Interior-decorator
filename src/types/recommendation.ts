import { FurnitureItem, FurnitureCatalogEntry } from './furniture'

export interface PlacementSuggestion {
  position: [number, number, number] // [x, y, z] in room
  rotation: [number, number, number] // [rotX, rotY, rotZ]
  alignedWall: 'north' | 'south' | 'east' | 'west' | 'center'
  wallLengthAvailable: number
  fitsWall: boolean
}

export interface RecommendationConflict {
  type: 'door_blocked' | 'window_blocked' | 'insufficient_wall' | 'circulation_compromised' | 'collision_existing'
  severity: 'warning' | 'fatal'
  description: string
}

export interface FurnitureRecommendation {
  id: string
  furnitureType: string
  name: string
  catalogEntry: FurnitureCatalogEntry
  reason: string
  requiredSpace: {
    footprintM2: number
    dimensions: string // e.g. "2.1m × 0.9m"
    clearanceDepthM: number
  }
  suggestedPlacement: PlacementSuggestion
  conflicts: RecommendationConflict[]
  isPhysicallyFeasible: boolean
}

export interface RecommendationRequest {
  roomType: string
  roomDimensions: {
    length: number
    width: number
    height: number
  }
  existingFurniture: FurnitureItem[]
  userRequirement?: string
}
