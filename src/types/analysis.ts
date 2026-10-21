export type SurfaceType = 'wall' | 'floor' | 'ceiling' | 'door' | 'window'

export interface BoundingBox2D {
  x: number // 0..1 relative
  y: number // 0..1 relative
  width: number // 0..1 relative
  height: number // 0..1 relative
}

export interface DetectedSurface {
  id: string
  type: SurfaceType
  label: string
  orientation: 'north' | 'south' | 'east' | 'west' | 'floor' | 'ceiling' | 'unknown'
  confidence: number // 0..1
  boundingBox?: BoundingBox2D
  isEstimated: boolean
  colorHex?: string
}

export interface DetectedObject {
  id: string
  label: string
  category: 'furniture' | 'appliance' | 'door' | 'window' | 'fixture' | 'major_object'
  confidence: number // 0..1
  boundingBox?: BoundingBox2D
  estimatedDimensions: {
    widthMeters: number | 'unknown'
    heightMeters: number | 'unknown'
    depthMeters: number | 'unknown'
  }
  relativePosition: {
    wallAlignment: 'north' | 'south' | 'east' | 'west' | 'center' | 'unknown'
    floorProximity: 'on_floor' | 'wall_mounted' | 'ceiling_mounted' | 'unknown'
  }
  isEstimated: boolean
  notes?: string
}

export interface RoomDimensions {
  lengthMeters: number | 'unknown'
  widthMeters: number | 'unknown'
  heightMeters: number | 'unknown'
  isEstimated: boolean
  uncertaintyMarginMeters: number
}

export interface RoomAnalysisResult {
  roomType: string
  confidence: number
  dimensions: RoomDimensions
  walls: DetectedSurface[]
  floor: DetectedSurface
  ceiling: DetectedSurface
  doors: DetectedObject[]
  windows: DetectedObject[]
  furniture: DetectedObject[]
  appliances: DetectedObject[]
  majorObjects: DetectedObject[]
  analyzedAt: string
  sourceImageCount: number
  summary: string
  hasUncertainGeometry: boolean
}
