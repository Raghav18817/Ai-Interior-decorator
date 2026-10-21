import { RoomAnalysisResult, DetectedObject } from '../types/analysis'

export interface Wall3D {
  id: string
  name: string
  orientation: 'north' | 'south' | 'east' | 'west'
  width: number
  height: number
  depth: number
  position: [number, number, number] // [x, y, z]
  rotation: [number, number, number]
  color: string
  isEstimated: boolean
}

export interface Opening3D {
  id: string
  type: 'door' | 'window'
  label: string
  width: number
  height: number
  depth: number
  position: [number, number, number]
  rotation: [number, number, number]
  isEstimated: boolean
}

export interface Furniture3D {
  id: string
  label: string
  category: string
  width: number
  height: number
  depth: number
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
  isEstimated: boolean
  confidence: number
}

export interface Room3DModel {
  dimensions: {
    length: number // X axis
    width: number // Z axis
    height: number // Y axis
    uncertainty: number
    isEstimated: boolean
  }
  floor: {
    width: number
    length: number
    color: string
  }
  ceiling: {
    width: number
    length: number
    height: number
    color: string
  }
  walls: Wall3D[]
  openings: Opening3D[]
  furniture: Furniture3D[]
  hasUncertainGeometry: boolean
}

const DEFAULT_FURNITURE_COLORS: Record<string, string> = {
  furniture: '#3b82f6', // blue
  appliance: '#64748b', // slate
  fixture: '#0ea5e9', // cyan
  major_object: '#8b5cf6', // purple
  door: '#78350f', // wood brown
  window: '#38bdf8' // glass sky
}

/**
 * Sanitizes dimension inputs against NaN, Infinity, negative values, and extreme architectural extremes.
 */
export function sanitizeRoomDimension(
  val: unknown,
  fallback: number,
  min: number = 1.5,
  max: number = 30.0
): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val <= 0) {
    return fallback
  }
  return Math.max(min, Math.min(max, val))
}

/**
 * Builds a deterministic 3D spatial model from room analysis data.
 * Handles malformed, extreme aspect ratios, or partial inputs gracefully with safe architectural defaults.
 */
export function buildRoom3DModel(analysis: RoomAnalysisResult | null | undefined): Room3DModel {
  // Safe architectural fallbacks if analysis is missing or malformed
  const defaultLength = 5.0
  const defaultWidth = 4.0
  const defaultHeight = 2.8

  const length = sanitizeRoomDimension(analysis?.dimensions?.lengthMeters, defaultLength, 1.5, 30.0)
  const width = sanitizeRoomDimension(analysis?.dimensions?.widthMeters, defaultWidth, 1.5, 30.0)
  const height = sanitizeRoomDimension(analysis?.dimensions?.heightMeters, defaultHeight, 1.8, 10.0)

  const wallThickness = 0.15
  const halfL = length / 2
  const halfW = width / 2
  const halfH = height / 2

  const floorColor = analysis?.floor?.colorHex || '#c2b280'
  const wallColor = analysis?.walls?.[0]?.colorHex || '#e2e8f0'
  const hasUncertainGeometry = analysis?.hasUncertainGeometry ?? true
  const uncertainty = typeof analysis?.dimensions?.uncertaintyMarginMeters === 'number' && !isNaN(analysis.dimensions.uncertaintyMarginMeters)
    ? Math.max(0.1, Math.min(2.0, analysis.dimensions.uncertaintyMarginMeters))
    : 0.5

  // 1. Construct 4 perimeter walls
  const walls: Wall3D[] = [
    // North Wall (+Z facing back)
    {
      id: 'wall_north',
      name: 'North Wall',
      orientation: 'north',
      width: length,
      height: height,
      depth: wallThickness,
      position: [0, halfH, -halfW],
      rotation: [0, 0, 0],
      color: wallColor,
      isEstimated: false
    },
    // South Wall (-Z camera side) - explicitly marked estimated if single photo
    {
      id: 'wall_south',
      name: 'South Wall',
      orientation: 'south',
      width: length,
      height: height,
      depth: wallThickness,
      position: [0, halfH, halfW],
      rotation: [0, 0, 0],
      color: wallColor,
      isEstimated: hasUncertainGeometry
    },
    // West Wall (-X left side)
    {
      id: 'wall_west',
      name: 'West Wall',
      orientation: 'west',
      width: width,
      height: height,
      depth: wallThickness,
      position: [-halfL, halfH, 0],
      rotation: [0, Math.PI / 2, 0],
      color: wallColor,
      isEstimated: false
    },
    // East Wall (+X right side)
    {
      id: 'wall_east',
      name: 'East Wall',
      orientation: 'east',
      width: width,
      height: height,
      depth: wallThickness,
      position: [halfL, halfH, 0],
      rotation: [0, Math.PI / 2, 0],
      color: wallColor,
      isEstimated: false
    }
  ]

  // 2. Openings (Doors & Windows)
  const openings: Opening3D[] = []

  const rawDoors = Array.isArray(analysis?.doors) ? analysis.doors : []
  rawDoors.forEach((door, idx) => {
    const doorW = typeof door.estimatedDimensions?.widthMeters === 'number' ? door.estimatedDimensions.widthMeters : 0.9
    const doorH = typeof door.estimatedDimensions?.heightMeters === 'number' ? door.estimatedDimensions.heightMeters : 2.1
    // Align with wall
    let pos: [number, number, number] = [-halfL, doorH / 2, -halfW * 0.3]
    let rot: [number, number, number] = [0, Math.PI / 2, 0]

    if (door.relativePosition?.wallAlignment === 'east') {
      pos = [halfL, doorH / 2, 0]
      rot = [0, Math.PI / 2, 0]
    } else if (door.relativePosition?.wallAlignment === 'north') {
      pos = [-halfL * 0.4, doorH / 2, -halfW]
      rot = [0, 0, 0]
    }

    openings.push({
      id: door.id || `door_${idx}`,
      type: 'door',
      label: door.label || 'Door',
      width: doorW,
      height: doorH,
      depth: 0.1,
      position: pos,
      rotation: rot,
      isEstimated: true
    })
  })

  const rawWindows = Array.isArray(analysis?.windows) ? analysis.windows : []
  rawWindows.forEach((win, idx) => {
    const winW = typeof win.estimatedDimensions?.widthMeters === 'number' ? win.estimatedDimensions.widthMeters : 1.4
    const winH = typeof win.estimatedDimensions?.heightMeters === 'number' ? win.estimatedDimensions.heightMeters : 1.4
    const winY = 1.0 + winH / 2 // Window sill height ~ 1.0m

    let pos: [number, number, number] = [halfL, winY, 0]
    let rot: [number, number, number] = [0, Math.PI / 2, 0]

    if (win.relativePosition?.wallAlignment === 'west') {
      pos = [-halfL, winY, 0]
      rot = [0, Math.PI / 2, 0]
    } else if (win.relativePosition?.wallAlignment === 'north') {
      pos = [halfL * 0.4, winY, -halfW]
      rot = [0, 0, 0]
    }

    openings.push({
      id: win.id || `win_${idx}`,
      type: 'window',
      label: win.label || 'Window',
      width: winW,
      height: winH,
      depth: 0.08,
      position: pos,
      rotation: rot,
      isEstimated: true
    })
  })

  // 3. Furniture & Objects 3D synthesis
  const furniture: Furniture3D[] = []
  const detectedItems: DetectedObject[] = [
    ...(Array.isArray(analysis?.furniture) ? analysis.furniture : []),
    ...(Array.isArray(analysis?.appliances) ? analysis.appliances : []),
    ...(Array.isArray(analysis?.majorObjects) ? analysis.majorObjects : [])
  ]

  detectedItems.forEach((item, idx) => {
    const objW = typeof item.estimatedDimensions?.widthMeters === 'number' ? item.estimatedDimensions.widthMeters : 1.0
    const objH = typeof item.estimatedDimensions?.heightMeters === 'number' ? item.estimatedDimensions.heightMeters : 0.8
    const objD = typeof item.estimatedDimensions?.depthMeters === 'number' ? item.estimatedDimensions.depthMeters : 0.8

    // Calculate 3D coordinate from relative wall position
    let posX = 0
    let posZ = 0
    let posY = objH / 2 // rest on floor

    if (item.relativePosition?.floorProximity === 'wall_mounted') {
      posY = 1.5 // Eye-level wall mount (e.g. TV)
    }

    if (item.relativePosition?.wallAlignment === 'north') {
      posX = (idx % 2 === 0 ? -0.2 : 0.4) * halfL
      posZ = -halfW + objD / 2 + 0.1
    } else if (item.relativePosition?.wallAlignment === 'south') {
      posX = 0
      posZ = halfW - objD / 2 - 0.1
    } else if (item.relativePosition?.wallAlignment === 'west') {
      posX = -halfL + objW / 2 + 0.1
      posZ = 0
    } else if (item.relativePosition?.wallAlignment === 'east') {
      posX = halfL - objW / 2 - 0.1
      posZ = 0
    } else {
      // Center
      posX = 0
      posZ = (idx % 2 === 0 ? 0.2 : -0.2)
    }

    // Color code based on category
    const itemColor = DEFAULT_FURNITURE_COLORS[item.category] || '#3b82f6'

    furniture.push({
      id: item.id || `furn_${idx}`,
      label: item.label || 'Furniture Object',
      category: item.category || 'furniture',
      width: objW,
      height: objH,
      depth: objD,
      position: [posX, posY, posZ],
      rotation: [0, 0, 0],
      color: itemColor,
      isEstimated: true,
      confidence: item.confidence || 0.8
    })
  })

  return {
    dimensions: {
      length,
      width,
      height,
      uncertainty,
      isEstimated: true
    },
    floor: {
      width: length,
      length: width,
      color: floorColor
    },
    ceiling: {
      width: length,
      length: width,
      height,
      color: '#f8fafc'
    },
    walls,
    openings,
    furniture,
    hasUncertainGeometry
  }
}
