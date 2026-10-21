import { FurnitureCatalogEntry } from '../types/furniture'

/**
 * Standard furniture dimensions based on Architectural Graphic Standards & Neufert Architects' Data.
 * Measurements are in SI meters.
 */
export const VERIFIED_FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  // Seating
  {
    type: 'sofa_3seater',
    name: '3-Seater Sofa',
    category: 'seating',
    defaultWidth: 2.1,
    defaultHeight: 0.85,
    defaultDepth: 0.9,
    defaultColor: '#334155', // Slate dark
    clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.3 },
    suitableRooms: ['Living Room', 'Office', 'Other'],
    standardsReference: 'Neufert Architects Data 4th Ed. § Wohnen (p. 283)'
  },
  {
    type: 'armchair',
    name: 'Accent Armchair',
    category: 'seating',
    defaultWidth: 0.85,
    defaultHeight: 0.85,
    defaultDepth: 0.85,
    defaultColor: '#0369a1', // Sky ocean
    clearanceRequired: { frontMeters: 0.6, sidesMeters: 0.2 },
    suitableRooms: ['Living Room', 'Bedroom', 'Office', 'Other'],
    standardsReference: 'Architectural Graphic Standards 12th Ed. (p. 614)'
  },

  // Tables
  {
    type: 'coffee_table',
    name: 'Rectangular Coffee Table',
    category: 'tables',
    defaultWidth: 1.1,
    defaultHeight: 0.45,
    defaultDepth: 0.6,
    defaultColor: '#78350f', // Warm walnut
    clearanceRequired: { frontMeters: 0.45, sidesMeters: 0.45 },
    suitableRooms: ['Living Room', 'Other'],
    standardsReference: 'Architectural Graphic Standards 12th Ed. (p. 615)'
  },
  {
    type: 'dining_table_4seater',
    name: '4-Person Dining Table',
    category: 'tables',
    defaultWidth: 1.4,
    defaultHeight: 0.76,
    defaultDepth: 0.85,
    defaultColor: '#854d0e', // Oak
    clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.8 },
    suitableRooms: ['Living Room', 'Kitchen', 'Other'],
    standardsReference: 'Neufert Architects Data 4th Ed. § Speiseraum (p. 287)'
  },

  // Beds
  {
    type: 'queen_bed',
    name: 'Queen Bed with Frame',
    category: 'beds',
    defaultWidth: 1.6,
    defaultHeight: 1.0,
    defaultDepth: 2.1,
    defaultColor: '#1e293b', // Deep indigo
    clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.6 },
    suitableRooms: ['Bedroom'],
    standardsReference: 'ISO 19833 / Neufert Architects Data (p. 289)'
  },
  {
    type: 'nightstand',
    name: 'Bedside Nightstand',
    category: 'tables',
    defaultWidth: 0.5,
    defaultHeight: 0.55,
    defaultDepth: 0.45,
    defaultColor: '#475569',
    clearanceRequired: { frontMeters: 0.5, sidesMeters: 0.1 },
    suitableRooms: ['Bedroom'],
    standardsReference: 'Neufert Architects Data (p. 290)'
  },

  // Workspace
  {
    type: 'study_desk',
    name: 'Executive Study Desk',
    category: 'workspace',
    defaultWidth: 1.4,
    defaultHeight: 0.75,
    defaultDepth: 0.7,
    defaultColor: '#1f2937', // Graphite
    clearanceRequired: { frontMeters: 0.9, sidesMeters: 0.3 },
    suitableRooms: ['Office', 'Bedroom', 'Living Room', 'Other'],
    standardsReference: 'BIFMA G1-2017 Ergonomics Guideline for Furniture'
  },
  {
    type: 'ergonomic_chair',
    name: 'Ergonomic Task Chair',
    category: 'workspace',
    defaultWidth: 0.65,
    defaultHeight: 1.05,
    defaultDepth: 0.65,
    defaultColor: '#0f172a',
    clearanceRequired: { frontMeters: 0.7, sidesMeters: 0.3 },
    suitableRooms: ['Office', 'Living Room', 'Bedroom', 'Other'],
    standardsReference: 'ANSI/BIFMA X5.1-2017 Office Seating'
  },

  // Storage
  {
    type: 'bookshelf',
    name: 'Vertical Bookshelf',
    category: 'storage',
    defaultWidth: 0.9,
    defaultHeight: 1.9,
    defaultDepth: 0.35,
    defaultColor: '#451a03',
    clearanceRequired: { frontMeters: 0.7, sidesMeters: 0.1 },
    suitableRooms: ['Living Room', 'Office', 'Bedroom', 'Other'],
    standardsReference: 'Neufert Architects Data (p. 292)'
  },
  {
    type: 'wardrobe_2door',
    name: '2-Door Wardrobe',
    category: 'storage',
    defaultWidth: 1.2,
    defaultHeight: 2.1,
    defaultDepth: 0.6,
    defaultColor: '#334155',
    clearanceRequired: { frontMeters: 0.9, sidesMeters: 0.1 },
    suitableRooms: ['Bedroom', 'Other'],
    standardsReference: 'Neufert Architects Data (p. 291)'
  },
  {
    type: 'tv_console',
    name: 'Lowline TV Media Credenza',
    category: 'storage',
    defaultWidth: 1.6,
    defaultHeight: 0.45,
    defaultDepth: 0.4,
    defaultColor: '#1e293b',
    clearanceRequired: { frontMeters: 0.6, sidesMeters: 0.2 },
    suitableRooms: ['Living Room', 'Bedroom', 'Other'],
    standardsReference: 'Architectural Graphic Standards 12th Ed. (p. 616)'
  },
  {
    type: 'kitchen_counter',
    name: 'Fitted Kitchenette Counter Unit',
    category: 'tables',
    defaultWidth: 2.2,
    defaultHeight: 0.9,
    defaultDepth: 0.65,
    defaultColor: '#f8fafc',
    clearanceRequired: { frontMeters: 0.9, sidesMeters: 0.2 },
    suitableRooms: ['Living Room', 'Kitchen', 'Other'],
    standardsReference: 'Architectural Graphic Standards 12th Ed. (p. 620)'
  },
  {
    type: 'retro_fridge',
    name: 'Vintage Mint-Green Refrigerator',
    category: 'storage',
    defaultWidth: 0.7,
    defaultHeight: 1.65,
    defaultDepth: 0.68,
    defaultColor: '#86efac',
    clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.1 },
    suitableRooms: ['Living Room', 'Kitchen', 'Other'],
    standardsReference: 'Neufert Architects Data § Küche (p. 295)'
  },
  {
    type: 'loft_ladder',
    name: 'Rustic Wooden Loft Ladder',
    category: 'storage',
    defaultWidth: 0.5,
    defaultHeight: 2.4,
    defaultDepth: 0.65,
    defaultColor: '#92400e',
    clearanceRequired: { frontMeters: 0.6, sidesMeters: 0.2 },
    suitableRooms: ['Living Room', 'Bedroom', 'Other'],
    standardsReference: 'Architectural Graphic Standards 12th Ed. (p. 628)'
  },
  {
    type: 'plant_pot',
    name: 'Botanical Potted Plant',
    category: 'decor',
    defaultWidth: 0.45,
    defaultHeight: 0.85,
    defaultDepth: 0.45,
    defaultColor: '#065f46',
    clearanceRequired: { frontMeters: 0.3, sidesMeters: 0.2 },
    suitableRooms: ['Living Room', 'Bedroom', 'Office', 'Other'],
    standardsReference: 'Interior Landscape Design Standards'
  }
]
