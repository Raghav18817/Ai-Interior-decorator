export type FurnitureCategory = 
  | 'seating'
  | 'tables'
  | 'beds'
  | 'storage'
  | 'workspace'
  | 'electronics'
  | 'decor'

export interface FurnitureItem {
  id: string
  type: string
  name: string
  category: FurnitureCategory
  width: number // in meters (X-axis)
  height: number // in meters (Y-axis)
  depth: number // in meters (Z-axis)
  position: [number, number, number] // [x, y, z]
  rotation: [number, number, number] // [rotX, rotY, rotZ] in radians
  room: string // Room type or room ID
  color: string
  clearanceRequired: {
    frontMeters: number
    sidesMeters: number
  }
  isExisting: boolean // true = detected from photo; false = newly added/recommended
  standardsReference?: string
}

export interface FurnitureCatalogEntry {
  type: string
  name: string
  category: FurnitureCategory
  defaultWidth: number
  defaultHeight: number
  defaultDepth: number
  defaultColor: string
  clearanceRequired: {
    frontMeters: number
    sidesMeters: number
  }
  suitableRooms: string[]
  standardsReference: string
}
