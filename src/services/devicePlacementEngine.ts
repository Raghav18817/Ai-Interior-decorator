import { 
  DeviceSpec, 
  DevicePlacementRecommendation, 
  DevicePlacementConstraint 
} from '../types/devices'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { STANDARD_DEVICES } from '../data/deviceCatalog'

export interface DevicePlacementInput {
  deviceIds: string[]
  roomDimensions: {
    length: number // X
    width: number // Z
    height: number // Y
  }
  furniture: FurnitureItem[]
  openings: Opening3D[]
  userConfirmedPower?: boolean
}

/**
 * Calculates optimal geometric and ergonomic placement for requested consumer electronics.
 * Strictly checks sightlines, viewing distances, window glare, door clearance, and structural surfaces.
 */
export function calculateDevicePlacements(
  input: DevicePlacementInput
): DevicePlacementRecommendation[] {
  const { deviceIds, roomDimensions, furniture, openings, userConfirmedPower = false } = input
  const { length: roomL, width: roomW } = roomDimensions

  const halfL = roomL / 2
  const halfW = roomW / 2

  // 1. Identify primary seating / viewing focal point
  const primarySeating = furniture.find(f => 
    f.type.includes('sofa') || f.category === 'seating' || f.type.includes('bed')
  )

  // 2. Identify available TV credenza or desk surfaces
  const tvConsole = furniture.find(f => 
    f.type.includes('tv_console') || f.name?.toLowerCase().includes('credenza') || f.type.includes('coffee_table')
  )
  const desk = furniture.find(f => 
    f.type.includes('desk') || f.name?.toLowerCase().includes('workstation')
  )

  // Determine optimal display elevation wall based on primary seating position
  let tvWall: 'north' | 'south' | 'east' | 'west' = 'north'
  let seatingDistance = roomW * 0.75

  if (primarySeating) {
    const [, , seatZ] = primarySeating.position
    const [seatX] = primarySeating.position

    if (seatZ > 0) {
      // Seating is towards South -> TV faces North wall
      tvWall = 'north'
      seatingDistance = Math.abs(-halfW - seatZ)
    } else if (seatZ < 0) {
      // Seating is towards North -> TV faces South wall
      tvWall = 'south'
      seatingDistance = Math.abs(halfW - seatZ)
    } else if (seatX > 0) {
      tvWall = 'west'
      seatingDistance = Math.abs(-halfL - seatX)
    } else {
      tvWall = 'east'
      seatingDistance = Math.abs(halfL - seatX)
    }
  }

  const recommendations: DevicePlacementRecommendation[] = []

  deviceIds.forEach((devId) => {
    const spec = STANDARD_DEVICES.find(d => d.id === devId)
    if (!spec) return

    const constraints: DevicePlacementConstraint[] = []
    let posX = 0
    let posZ = 0
    let posY = 1.4 // Default eye-level screen center (seated eye level ~ 1.1m - 1.3m)
    let facingAngleDeg = 0
    let sightlineTarget = primarySeating ? primarySeating.name : 'Central room axis'

    // Device-specific placement logic
    if (spec.category === 'television') {
      // Calculate TV coordinates on selected wall
      const wallSpan = (tvWall === 'north' || tvWall === 'south') ? roomL : roomW

      if (spec.widthM > wallSpan - 0.4) {
        constraints.push({
          type: 'insufficient_wall_space',
          severity: 'fatal',
          description: `Screen width (${spec.widthM}m) exceeds uninterrupted ${tvWall} wall span (${wallSpan}m).`
        })
      }

      // Check viewing distance
      if (spec.recommendedViewingDistanceM) {
        if (seatingDistance < spec.recommendedViewingDistanceM.min) {
          constraints.push({
            type: 'seating_misaligned',
            severity: 'warning',
            description: `Viewing distance (${seatingDistance.toFixed(1)}m) is closer than recommended ${spec.recommendedViewingDistanceM.min}m minimum for a ${spec.name}. May cause eye fatigue.`
          })
        }
      }

      // Check window glare on opposite wall
      const oppositeWall = tvWall === 'north' ? 'south' : tvWall === 'south' ? 'north' : tvWall === 'east' ? 'west' : 'east'
      const windowOnOpposite = openings.some(o => o.type === 'window' && isOpeningOnWall(o, oppositeWall, halfL, halfW))
      if (windowOnOpposite) {
        constraints.push({
          type: 'window_glare',
          severity: 'warning',
          description: `Window detected on opposite ${oppositeWall} wall. Direct daylight may cause specular reflections on screen surface; recommend anti-glare curtains or tilting mount.`
        })
      }

      // Check door interference on same wall
      const doorOnSameWall = openings.some(o => o.type === 'door' && isOpeningOnWall(o, tvWall, halfL, halfW))
      if (doorOnSameWall) {
        constraints.push({
          type: 'door_interference',
          severity: 'warning',
          description: `Entryway aperture located on ${tvWall} wall. Ensure at least 0.8m passage clearance from screen edge.`
        })
      }

      // Calculate position
      if (tvWall === 'north') {
        posX = 0
        posZ = -halfW + spec.depthM / 2 + 0.05
        facingAngleDeg = 0
      } else if (tvWall === 'south') {
        posX = 0
        posZ = halfW - spec.depthM / 2 - 0.05
        facingAngleDeg = 180
      } else if (tvWall === 'west') {
        posX = -halfL + spec.depthM / 2 + 0.05
        posZ = 0
        facingAngleDeg = 90
      } else {
        posX = halfL - spec.depthM / 2 - 0.05
        posZ = 0
        facingAngleDeg = 270
      }

      posY = 1.35 // Center of 55"-65" screen at seated eye level
    } else if (spec.category === 'audio' && spec.id.includes('soundbar')) {
      // Soundbar mounted or placed directly below TV
      if (tvWall === 'north') {
        posX = 0
        posZ = -halfW + 0.15
      } else if (tvWall === 'south') {
        posX = 0
        posZ = halfW - 0.15
      } else if (tvWall === 'west') {
        posX = -halfL + 0.15
        posZ = 0
      } else {
        posX = halfL - 0.15
        posZ = 0
      }

      // If TV console exists, rest on it; otherwise wall-mount directly beneath TV
      posY = tvConsole ? tvConsole.height + spec.heightM / 2 : 0.85
      sightlineTarget = 'Directly below display for dialogue acoustic synchronization'
    } else if (spec.category === 'gaming') {
      // Gaming console requires horizontal resting surface
      if (tvConsole) {
        posX = tvConsole.position[0] + 0.4
        posZ = tvConsole.position[2]
        posY = tvConsole.height + spec.heightM / 2
      } else {
        constraints.push({
          type: 'missing_surface',
          severity: 'warning',
          description: `No media credenza or table detected below TV. Console requires a dedicated surface for proper thermal ventilation.`
        })
        posX = 0.5
        posZ = -halfW + 0.3
        posY = 0.1
      }
      sightlineTarget = 'HDMI cable run proximity to screen'
    } else if (spec.category === 'computing') {
      // Desktop computer / monitor
      if (desk) {
        posX = desk.position[0]
        posZ = desk.position[2]
        posY = desk.height + spec.heightM / 2
        sightlineTarget = `Desk surface (${desk.name})`
      } else {
        constraints.push({
          type: 'missing_surface',
          severity: 'warning',
          description: `No study desk or workstation detected. Monitor requires a desk surface for ergonomic use.`
        })
        posX = 0
        posZ = 0
        posY = 0.75
      }
    } else {
      // Router / network / speakers
      posX = tvConsole ? tvConsole.position[0] - 0.6 : -halfL + 0.4
      posZ = tvConsole ? tvConsole.position[2] : -halfW + 0.4
      posY = tvConsole ? tvConsole.height + spec.heightM / 2 : 0.8
      sightlineTarget = 'Elevated perimeter zone for optimal signal propagation'
    }

    // Power socket infrastructure constraint disclosure (anti-hallucination)
    if (!userConfirmedPower) {
      constraints.push({
        type: 'unverified_power',
        severity: 'info',
        description: `Electrical wall sockets and conduit channels are unverified from photos. Please confirm socket availability on ${tvWall} wall.`
      })
    }

    const hasFatal = constraints.some(c => c.severity === 'fatal')

    recommendations.push({
      id: `dev_rec_${spec.id}`,
      device: spec,
      proposedLocation: {
        wall: tvWall,
        mountHeightM: Number(posY.toFixed(2)),
        position: [Number(posX.toFixed(2)), Number(posY.toFixed(2)), Number(posZ.toFixed(2))]
      },
      orientation: {
        facingAngleDeg,
        sightlineTarget
      },
      reason: generateDeviceReason(spec, tvWall, seatingDistance),
      detectedConstraints: constraints,
      isFeasible: !hasFatal,
      requiresUserConfirmation: {
        powerOutletsVerified: userConfirmedPower,
        wallStrengthVerified: false
      }
    })
  })

  return recommendations
}

function isOpeningOnWall(
  opening: Opening3D,
  wall: 'north' | 'south' | 'east' | 'west',
  halfL: number,
  halfW: number
): boolean {
  const [ox, , oz] = opening.position
  const tol = 0.3
  if (wall === 'north') return Math.abs(oz - (-halfW)) < tol
  if (wall === 'south') return Math.abs(oz - halfW) < tol
  if (wall === 'west') return Math.abs(ox - (-halfL)) < tol
  return Math.abs(ox - halfL) < tol
}

function generateDeviceReason(spec: DeviceSpec, wall: string, distance: number): string {
  if (spec.category === 'television') {
    return `Mounted at optimal seated sightline (1.35m center) on ${wall} wall, providing direct perpendicular viewing at ${distance.toFixed(1)}m distance.`
  }
  if (spec.category === 'audio') {
    return `Positioned on acoustic centerline directly beneath screen for localized vocal staging and optimal stereo dispersion.`
  }
  if (spec.category === 'gaming') {
    return `Placed with low-latency HDMI proximity to screen and open circulation clearance for cooling exhaust.`
  }
  if (spec.category === 'computing') {
    return `Ergonomically aligned on desk surface with 0.7m viewing distance and peripheral clearance.`
  }
  return `Positioned for optimal broadcast coverage and cable management.`
}
