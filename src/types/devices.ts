export type DeviceCategory = 
  | 'television'
  | 'audio'
  | 'gaming'
  | 'computing'
  | 'network'

export interface DeviceSpec {
  id: string
  name: string
  category: DeviceCategory
  widthM: number
  heightM: number
  depthM: number
  recommendedViewingDistanceM?: { min: number; max: number }
  mountType: 'wall_mount' | 'surface_mount'
  requiresSurfaceBelow?: boolean // e.g. console/soundbar needs credenza or shelf
}

export interface DevicePlacementConstraint {
  type: 
    | 'insufficient_wall_space'
    | 'window_glare'
    | 'door_interference'
    | 'seating_misaligned'
    | 'missing_surface'
    | 'unverified_power'
  severity: 'warning' | 'fatal' | 'info'
  description: string
}

export interface DevicePlacementRecommendation {
  id: string
  device: DeviceSpec
  proposedLocation: {
    wall: 'north' | 'south' | 'east' | 'west' | 'center'
    mountHeightM: number
    position: [number, number, number] // [x, y, z]
  }
  orientation: {
    facingAngleDeg: number
    sightlineTarget: string // e.g. "Primary Sofa Seating on South Wall"
  }
  reason: string
  detectedConstraints: DevicePlacementConstraint[]
  isFeasible: boolean
  requiresUserConfirmation: {
    powerOutletsVerified: boolean
    wallStrengthVerified: boolean
  }
}
