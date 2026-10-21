import { FurnitureItem, FurnitureCatalogEntry } from '../types/furniture'
import { RoomAnalysisResult, DetectedObject } from '../types/analysis'
import { VERIFIED_FURNITURE_CATALOG } from '../data/furnitureCatalog'

/**
 * Maps detected objects from computer vision analysis into standardized FurnitureItem objects.
 */
export function convertAnalysisToFurnitureItems(
  analysis: RoomAnalysisResult | null | undefined,
  roomName: string = 'Living Room'
): FurnitureItem[] {
  if (!analysis) return []

  const halfL = (typeof analysis.dimensions?.lengthMeters === 'number' ? analysis.dimensions.lengthMeters : 5.0) / 2
  const halfW = (typeof analysis.dimensions?.widthMeters === 'number' ? analysis.dimensions.widthMeters : 4.0) / 2

  const detected: DetectedObject[] = [
    ...(Array.isArray(analysis.furniture) ? analysis.furniture : []),
    ...(Array.isArray(analysis.appliances) ? analysis.appliances : []),
    ...(Array.isArray(analysis.majorObjects) ? analysis.majorObjects : [])
  ]

  return detected.map((item, idx) => {
    // Try to match catalog standard dimensions if available
    const labelLower = (item.label || '').toLowerCase()
    let matchedCatalog: FurnitureCatalogEntry | undefined

    if (labelLower.includes('sofa')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'sofa_3seater')
    } else if (labelLower.includes('bed')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'queen_bed')
    } else if (labelLower.includes('desk')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'study_desk')
    } else if (labelLower.includes('chair')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'ergonomic_chair')
    } else if (labelLower.includes('coffee table') || labelLower.includes('coffee')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'coffee_table')
    } else if (labelLower.includes('tv') || labelLower.includes('screen')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'tv_console')
    } else if (labelLower.includes('kitchen') || labelLower.includes('counter') || labelLower.includes('cabinet')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'kitchen_counter')
    } else if (labelLower.includes('fridge') || labelLower.includes('refrigerator')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'retro_fridge')
    } else if (labelLower.includes('ladder') || labelLower.includes('loft')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'loft_ladder')
    } else if (labelLower.includes('plant') || labelLower.includes('pot')) {
      matchedCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'plant_pot')
    }

    const width = (typeof item.estimatedDimensions?.widthMeters === 'number' && !isNaN(item.estimatedDimensions.widthMeters) && item.estimatedDimensions.widthMeters > 0)
      ? item.estimatedDimensions.widthMeters
      : (matchedCatalog?.defaultWidth || 1.2)

    const height = (typeof item.estimatedDimensions?.heightMeters === 'number' && !isNaN(item.estimatedDimensions.heightMeters) && item.estimatedDimensions.heightMeters > 0)
      ? item.estimatedDimensions.heightMeters
      : (matchedCatalog?.defaultHeight || 0.8)

    const depth = (typeof item.estimatedDimensions?.depthMeters === 'number' && !isNaN(item.estimatedDimensions.depthMeters) && item.estimatedDimensions.depthMeters > 0)
      ? item.estimatedDimensions.depthMeters
      : (matchedCatalog?.defaultDepth || 0.8)

    let posX = 0
    let posZ = 0
    const posY = 0 // Anchored to floor

    if (item.relativePosition?.wallAlignment === 'north') {
      posX = (idx % 2 === 0 ? -0.2 : 0.4) * halfL
      posZ = -halfW + depth / 2 + 0.1
    } else if (item.relativePosition?.wallAlignment === 'south') {
      posX = 0
      posZ = halfW - depth / 2 - 0.1
    } else if (item.relativePosition?.wallAlignment === 'west') {
      posX = -halfL + width / 2 + 0.1
      posZ = 0
    } else if (item.relativePosition?.wallAlignment === 'east') {
      posX = halfL - width / 2 - 0.1
      posZ = 0
    } else {
      posX = 0
      posZ = (idx % 2 === 0 ? 0.2 : -0.2)
    }

    const category = (item.category === 'appliance' || item.category === 'major_object' || item.category === 'fixture')
      ? 'decor'
      : (matchedCatalog?.category || 'seating')

    return {
      id: item.id || `furn_detected_${idx}`,
      type: matchedCatalog?.type || item.category,
      name: item.label,
      category,
      width,
      height,
      depth,
      position: [posX, posY, posZ],
      rotation: [0, 0, 0],
      room: roomName,
      color: matchedCatalog?.defaultColor || '#3b82f6',
      clearanceRequired: matchedCatalog?.clearanceRequired || { frontMeters: 0.6, sidesMeters: 0.2 },
      isExisting: true,
      standardsReference: matchedCatalog?.standardsReference || 'Detected from photograph'
    }
  })
}
