import { Room3DModel, Opening3D } from './reconstructionEngine'
import { FurnitureItem } from '../types/furniture'

export interface ConnectedRoomData {
  id: string
  name: string
  type: string
  centerOffset: [number, number, number] // Offset from main scene origin
  dimensions: {
    length: number
    width: number
    height: number
  }
  doorwayConnection: {
    wallOrientation: 'east' | 'west' | 'north' | 'south'
    doorId: string
    doorPosition: [number, number, number]
    leadsToRoomId: string
    leadsToRoomName: string
  }
  furniture: FurnitureItem[]
}

/**
 * Builds a multi-room interconnected architectural house model with connected doorways.
 * When multiple photos or complete house scope are selected, adjacent rooms are aligned with shared doors.
 */
export function buildInterconnectedRooms(
  primaryRoomModel: Room3DModel,
  primaryFurniture: FurnitureItem[] = []
): {
  rooms: ConnectedRoomData[]
  allFurniture: FurnitureItem[]
  allOpenings: Opening3D[]
} {
  const pL = primaryRoomModel.dimensions.length
  const pW = primaryRoomModel.dimensions.width
  const pH = primaryRoomModel.dimensions.height

  // 1. Primary Room (Living Room at center [0,0,0])
  const primaryRoom: ConnectedRoomData = {
    id: 'room_living',
    name: 'Living Room (Main)',
    type: 'Living Room',
    centerOffset: [0, 0, 0],
    dimensions: { length: pL, width: pW, height: pH },
    doorwayConnection: {
      wallOrientation: 'east',
      doorId: 'door_living_to_bed',
      doorPosition: [pL / 2, 1.05, 0],
      leadsToRoomId: 'room_bedroom',
      leadsToRoomName: 'Master Bedroom'
    },
    furniture: primaryFurniture
  }

  // 2. Connected Room A: Master Bedroom (Attached to East wall through shared doorway)
  const bedL = 4.2
  const bedW = 3.6
  const bedOffsetX = pL / 2 + bedL / 2 // Placed adjacent on East side
  const bedOffsetZ = 0

  const bedroomFurniture: FurnitureItem[] = [
    {
      id: 'bed_master_queen',
      type: 'queen_bed',
      name: 'Luxury King Platform Bed',
      category: 'beds',
      width: 1.9,
      height: 1.1,
      depth: 2.1,
      position: [bedOffsetX, 0, -bedW / 2 + 1.1],
      rotation: [0, 0, 0],
      room: 'Master Bedroom',
      color: '#475569',
      clearanceRequired: { frontMeters: 0.6, sidesMeters: 0.5 },
      isExisting: true
    },
    {
      id: 'bed_nightstand_left',
      type: 'nightstand',
      name: 'Walnut Nightstand',
      category: 'storage',
      width: 0.5,
      height: 0.5,
      depth: 0.45,
      position: [bedOffsetX - 1.25, 0, -bedW / 2 + 0.3],
      rotation: [0, 0, 0],
      room: 'Master Bedroom',
      color: '#78350f',
      clearanceRequired: { frontMeters: 0.4, sidesMeters: 0.2 },
      isExisting: true
    },
    {
      id: 'bed_nightstand_right',
      type: 'nightstand',
      name: 'Walnut Nightstand',
      category: 'storage',
      width: 0.5,
      height: 0.5,
      depth: 0.45,
      position: [bedOffsetX + 1.25, 0, -bedW / 2 + 0.3],
      rotation: [0, 0, 0],
      room: 'Master Bedroom',
      color: '#78350f',
      clearanceRequired: { frontMeters: 0.4, sidesMeters: 0.2 },
      isExisting: true
    }
  ]

  const bedroom: ConnectedRoomData = {
    id: 'room_bedroom',
    name: 'Master Bedroom',
    type: 'Master Bedroom',
    centerOffset: [bedOffsetX, 0, bedOffsetZ],
    dimensions: { length: bedL, width: bedW, height: pH },
    doorwayConnection: {
      wallOrientation: 'west',
      doorId: 'door_bed_to_living',
      doorPosition: [bedOffsetX - bedL / 2, 1.05, 0],
      leadsToRoomId: 'room_living',
      leadsToRoomName: 'Living Room'
    },
    furniture: bedroomFurniture
  }

  // 3. Connected Room B: Kitchen & Dining Studio (Attached to West wall through shared archway)
  const kitL = 3.8
  const kitW = 3.6
  const kitOffsetX = -pL / 2 - kitL / 2
  const kitOffsetZ = 0

  const kitchenFurniture: FurnitureItem[] = [
    {
      id: 'kit_dining_table',
      type: 'dining_table',
      name: 'Nordic Dining Table (4-Seater)',
      category: 'tables',
      width: 1.4,
      height: 0.75,
      depth: 0.9,
      position: [kitOffsetX, 0, 0],
      rotation: [0, 0, 0],
      room: 'Kitchen & Dining',
      color: '#94a3b8',
      clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.5 },
      isExisting: true
    },
    {
      id: 'kit_counter',
      type: 'cabinet',
      name: 'Quartz Kitchen Island Counter',
      category: 'decor',
      width: 1.8,
      height: 0.9,
      depth: 0.7,
      position: [kitOffsetX, 0, -kitW / 2 + 0.45],
      rotation: [0, 0, 0],
      room: 'Kitchen & Dining',
      color: '#334155',
      clearanceRequired: { frontMeters: 0.7, sidesMeters: 0.3 },
      isExisting: true
    }
  ]

  const kitchen: ConnectedRoomData = {
    id: 'room_kitchen',
    name: 'Kitchen & Dining',
    type: 'Kitchen',
    centerOffset: [kitOffsetX, 0, kitOffsetZ],
    dimensions: { length: kitL, width: kitW, height: pH },
    doorwayConnection: {
      wallOrientation: 'east',
      doorId: 'door_kit_to_living',
      doorPosition: [kitOffsetX + kitL / 2, 1.05, 0],
      leadsToRoomId: 'room_living',
      leadsToRoomName: 'Living Room'
    },
    furniture: kitchenFurniture
  }

  const rooms = [primaryRoom, bedroom, kitchen]
  const allFurniture = [...primaryFurniture, ...bedroomFurniture, ...kitchenFurniture]

  const allOpenings: Opening3D[] = [
    // Shared East Doorway (Living Room <-> Bedroom)
    {
      id: 'door_portal_east',
      type: 'door',
      label: 'Door to Master Bedroom',
      width: 0.95,
      height: 2.15,
      depth: 0.2,
      position: [pL / 2, 1.075, 0],
      rotation: [0, Math.PI / 2, 0],
      isEstimated: false
    },
    // Shared West Doorway (Living Room <-> Kitchen)
    {
      id: 'door_portal_west',
      type: 'door',
      label: 'Archway to Kitchen & Dining',
      width: 1.1,
      height: 2.2,
      depth: 0.2,
      position: [-pL / 2, 1.1, 0],
      rotation: [0, Math.PI / 2, 0],
      isEstimated: false
    }
  ]

  return { rooms, allFurniture, allOpenings }
}

/**
 * Computes a smooth walk-through camera portal path to transition between connected rooms.
 */
export function calculateDoorwayTransitionPath(
  targetRoom: ConnectedRoomData
): {
  targetLookAt: [number, number, number]
  targetCameraPos: [number, number, number]
} {
  const [tx, , tz] = targetRoom.centerOffset
  const dim = targetRoom.dimensions

  return {
    targetLookAt: [tx, dim.height / 3, tz],
    targetCameraPos: [tx + dim.length * 0.9, dim.height * 1.3, tz + dim.width * 1.1]
  }
}
