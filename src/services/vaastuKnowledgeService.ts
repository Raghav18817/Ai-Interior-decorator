/**
 * Vaastu.ai Knowledge Service
 * Tagline: "Thoughtful Spaces. Meaningful Living."
 * 
 * Provides structured design principles across Vaastu Shastra and major religious / cultural traditions,
 * strictly distinguishing traditional guidance from scientific facts, and mapping directions to room coordinates.
 */

export type CulturalTradition = 
  | 'vaastu_hindu'
  | 'islamic'
  | 'christian'
  | 'buddhist'
  | 'jain'
  | 'none'

export interface TraditionMetadata {
  id: CulturalTradition
  label: string
  shortLabel: string
  description: string
  focusAreas: string[]
  disclaimer: string
}

export const CULTURAL_TRADITIONS: TraditionMetadata[] = [
  {
    id: 'vaastu_hindu',
    label: 'Hindu Traditions (Vaastu Shastra)',
    shortLabel: 'Vaastu Shastra',
    description: 'Ancient Indian architectural philosophy harmonizing 5 natural elements (Pancha Bhoota) and 8 directional energies.',
    focusAreas: ['Directional zoning (Ishanya, Agni, Nairutya, Vayavya)', 'Bed & desk alignment', 'Brahmasthan central open circulation', 'Entrance orientation'],
    disclaimer: 'Vaastu Shastra offers traditional cultural guidelines. Interpretations vary across texts (Mayamata, Manasara, Brihat Samhita) and regional practitioners. They are cultural principles rather than empirical scientific guarantees.'
  },
  {
    id: 'islamic',
    label: 'Islamic Traditions',
    shortLabel: 'Islamic Guidance',
    description: 'Mindful architectural design emphasizing Qibla orientation, family & guest circulation privacy, modesty, and clean functional geometry.',
    focusAreas: ['Respectful Qibla orientation for prayer nook & bed alignment', 'Privacy zoning between public receiving & private family areas', 'Cleanliness & water access hygiene', 'Uncluttered natural daylight'],
    disclaimer: 'Islamic home recommendations reflect traditional cultural etiquettes (Adaab) and respectful spatial consideration. Practices vary across regional cultures and individual interpretations.'
  },
  {
    id: 'christian',
    label: 'Christian Traditions',
    shortLabel: 'Christian Traditions',
    description: 'Design focusing on communal fellowship, natural morning daylight (East-facing spaces), and dedicated prayer or scripture study nooks.',
    focusAreas: ['East-facing morning daylight orientation', 'Central family gathering table for meals & fellowship', 'Quiet devotional or reading corner', 'Welcoming hospitality entrance'],
    disclaimer: 'Christian design traditions are rooted in historical architectural customs (such as Eastward daylight orientation) and personal spiritual lifestyle preferences rather than rigid dogmatic rules.'
  },
  {
    id: 'buddhist',
    label: 'Buddhist Traditions',
    shortLabel: 'Buddhist Mindfulness',
    description: 'Zen and mindful spatial flow emphasizing minimal clutter, natural organic materials, serenity, and dedicated meditation spaces.',
    focusAreas: ['Mindful decluttering & open walking pathways', 'Natural materials (wood, stone, bamboo, linen)', 'Tranquil meditation corner facing quiet outdoor views', 'Harmonious muted earthy tones'],
    disclaimer: 'Buddhist spatial concepts prioritize personal mindfulness, peace, and simplicity. They serve as mindful lifestyle suggestions rather than dogmatic structural mandates.'
  },
  {
    id: 'jain',
    label: 'Jain Traditions',
    shortLabel: 'Jain Guidance',
    description: 'Living in harmony with Ahimsa (non-harm), peaceful tranquility, daylight utilization, and strict food preparation hygiene.',
    focusAreas: ['Simplicity & non-ostentatious elegance', 'Hygienic, peaceful kitchen & dining zoning with ample natural light', 'Quiet introspection & swadhyaya study nook', 'Clean, tranquil floor areas'],
    disclaimer: 'Jain design considerations reflect values of non-violence, simplicity, and purity. These are cultural values that guide thoughtful living.'
  },
  {
    id: 'none',
    label: 'No Religious or Cultural Preference (Modern Architectural)',
    shortLabel: 'Modern Architectural',
    description: 'Purely evidence-based interior design following Neufert spatial standards, IBC safety egress clearances, and modern ergonomics.',
    focusAreas: ['Circulation corridor clearances (Neufert & IBC standards)', 'Ergonomic SMPTE TV viewing angles', 'Natural ventilation & window daylighting', 'Space-maximizing multi-functional layouts'],
    disclaimer: 'Focuses entirely on physical ergonomics, clearance standards, and modern aesthetic balance without cultural or spiritual guidelines.'
  }
]

export type CardinalDirection = 
  | 'North' 
  | 'Northeast' 
  | 'East' 
  | 'Southeast' 
  | 'South' 
  | 'Southwest' 
  | 'West' 
  | 'Northwest' 
  | 'Center'

export interface DirectionalGuidance {
  direction: CardinalDirection
  vaastuZoneName: string
  governingElement: string
  bestSuitedFor: string[]
  avoidFor: string[]
  recommendedColors: string[]
  rationale: string
}

export const VAASTU_DIRECTIONAL_MAP: Record<CardinalDirection, DirectionalGuidance> = {
  Northeast: {
    direction: 'Northeast',
    vaastuZoneName: 'Ishanya (Water / Sacred)',
    governingElement: 'Water (Jal) & Consciousness',
    bestSuitedFor: ['Prayer altar / Mandir', 'Meditation or study nook', 'Light low-profile furniture', 'Windows for morning breeze'],
    avoidFor: ['Heavy storage wardrobes', 'Toilets / washrooms', 'Kitchen cooktops (clashes with Water)'],
    recommendedColors: ['White', 'Light Blue', 'Soft Cream', 'Pastel Yellow'],
    rationale: 'In Vaastu Shastra, Northeast is considered the spiritual receptor receiving morning cosmic energy. Keeping it light and open promotes clarity.'
  },
  East: {
    direction: 'East',
    vaastuZoneName: 'Purva (Sun / Indra)',
    governingElement: 'Sun / Solar Vitality',
    bestSuitedFor: ['Study desk (facing East while working)', 'Entrance doors', 'Living room seating', 'Balconies & large windows'],
    avoidFor: ['Tall opaque blockages', 'Heavy towering storage against the eastern wall'],
    recommendedColors: ['Light Green', 'Warm White', 'Sun Gold', 'Soft Beige'],
    rationale: 'Facing East while working or sitting is said to align with the sunrise and morning solar spectrum, promoting focus and alertness.'
  },
  Southeast: {
    direction: 'Southeast',
    vaastuZoneName: 'Agni (Fire)',
    governingElement: 'Fire (Agni)',
    bestSuitedFor: ['Kitchen / Cooking appliances', 'Electronics & media entertainment units', 'Warm accent lighting'],
    avoidFor: ['Master bedroom (can cause restlessness)', 'Water tanks or excessive cooling appliances'],
    recommendedColors: ['Warm Orange', 'Soft Coral', 'Terracotta', 'Cream'],
    rationale: 'Governed by the fire element; ideally suited for heat-generating activities, cooking, and electrical appliances.'
  },
  South: {
    direction: 'South',
    vaastuZoneName: 'Dakshin (Yama)',
    governingElement: 'Earth / Grounding',
    bestSuitedFor: ['Heavy furniture pieces', 'Tall wardrobes', 'Bed headboards facing South'],
    avoidFor: ['Main entrance or wide low apertures where security/harsh midday heat is a concern'],
    recommendedColors: ['Warm Taupe', 'Ochre', 'Earthy Brown', 'Beige'],
    rationale: 'Sleeping with head toward the South is widely advised in Vaastu, believed to align with Earth magnetic polarity and promote restful sleep.'
  },
  Southwest: {
    direction: 'Southwest',
    vaastuZoneName: 'Nairutya (Earth / Pitru)',
    governingElement: 'Earth (Prithvi) & Heaviness',
    bestSuitedFor: ['Master bedroom bed', 'Heaviest wardrobes and safes', 'Solid perimeter walls'],
    avoidFor: ['Main entrances', 'Toilets', 'Water fountains or central walking voids'],
    recommendedColors: ['Earthy Brown', 'Warm Sand', 'Clay Taupe', 'Muted Gold'],
    rationale: 'The Southwest is designated as the anchoring earth quadrant. Placing the master bed and heaviest pieces here creates physical and spatial stability.'
  },
  West: {
    direction: 'West',
    vaastuZoneName: 'Pashchim (Varuna)',
    governingElement: 'Water / Sunset',
    bestSuitedFor: ['Dining room table', 'Children / guest study desk', 'Secondary seating'],
    avoidFor: ['Prayer shrine facing West (traditionally preferred facing East/North)'],
    recommendedColors: ['Light Grey', 'Soft White', 'Seafoam', 'Muted Blue'],
    rationale: 'A neutral and calming evening quadrant suitable for dining and gathering.'
  },
  Northwest: {
    direction: 'Northwest',
    vaastuZoneName: 'Vayavya (Air / Wind)',
    governingElement: 'Air (Vayu) & Movement',
    bestSuitedFor: ['Guest bedroom', 'Dynamic storage', 'Finished goods', 'Ventilation openings'],
    avoidFor: ['Master bedroom for primary home owners (associated with frequent movement)'],
    recommendedColors: ['Silver Grey', 'Pearly White', 'Light Sky Blue'],
    rationale: 'Governed by air and movement; well-suited for temporary visitors, guests, and cross-ventilation.'
  },
  North: {
    direction: 'North',
    vaastuZoneName: 'Uttar (Kuber / Mercury)',
    governingElement: 'Water / Opportunity',
    bestSuitedFor: ['Living room main seating', 'Work desk (facing North)', 'Bookcases', 'Wall mirrors'],
    avoidFor: ['Heavy blocking barricades without windows'],
    recommendedColors: ['Soft Green', 'Mint', 'Light Blue', 'Crisp White'],
    rationale: 'Associated with prosperity and intellect; facing North while studying or working is recommended for clarity.'
  },
  Center: {
    direction: 'Center',
    vaastuZoneName: 'Brahmasthan (Ether / Cosmos)',
    governingElement: 'Space (Akasha)',
    bestSuitedFor: ['Open circulation space', 'Central walking corridor', 'Low central coffee table or open floor area'],
    avoidFor: ['Heavy pillars', 'Structural walls', 'Toilets', 'Cluttered bulky blockades'],
    recommendedColors: ['Open White', 'Light Ivory', 'Neutral Cream'],
    rationale: 'The Brahmasthan is the lungs of the room. Keeping the central third clear ensures smooth physical circulation and spatial openness.'
  }
}

/**
 * Maps room compass orientation to 3D Cartesian coordinates [X, Z].
 * 
 * Room Coordinate Convention:
 * - Center is [0, 0]
 * - Room dimensions: Length along X [-length/2, +length/2], Width along Z [-width/2, +width/2]
 * - By default: North wall is along -Z, South wall is along +Z, East wall is +X, West wall is -X.
 *   If user calibrates entrance orientation, the compass coordinates rotate accordingly.
 */
export function mapDirectionToRoomCoordinates(
  direction: CardinalDirection,
  dimensions: { length: number; width: number; height?: number },
  compassRotationDegrees: number = 0
): { x: number; z: number; label: string } {
  const halfX = dimensions.length / 2
  const halfZ = dimensions.width / 2
  const insetFactor = 0.65 // Keep items slightly offset from perimeter for wall clearance

  // Base coordinates assuming North is -Z, East is +X
  let baseX = 0
  let baseZ = 0

  switch (direction) {
    case 'North':
      baseX = 0
      baseZ = -halfZ * insetFactor
      break
    case 'Northeast':
      baseX = halfX * insetFactor
      baseZ = -halfZ * insetFactor
      break
    case 'East':
      baseX = halfX * insetFactor
      baseZ = 0
      break
    case 'Southeast':
      baseX = halfX * insetFactor
      baseZ = halfZ * insetFactor
      break
    case 'South':
      baseX = 0
      baseZ = halfZ * insetFactor
      break
    case 'Southwest':
      baseX = -halfX * insetFactor
      baseZ = halfZ * insetFactor
      break
    case 'West':
      baseX = -halfX * insetFactor
      baseZ = 0
      break
    case 'Northwest':
      baseX = -halfX * insetFactor
      baseZ = -halfZ * insetFactor
      break
    case 'Center':
      baseX = 0
      baseZ = 0
      break
  }

  // Apply room compass rotation if calibrated by user (in degrees)
  if (compassRotationDegrees !== 0) {
    const rad = (compassRotationDegrees * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const rotX = baseX * cos - baseZ * sin
    const rotZ = baseX * sin + baseZ * cos
    return {
      x: Number(rotX.toFixed(2)),
      z: Number(rotZ.toFixed(2)),
      label: direction
    }
  }

  return {
    x: Number(baseX.toFixed(2)),
    z: Number(baseZ.toFixed(2)),
    label: direction
  }
}
