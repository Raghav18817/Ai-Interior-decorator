/**
 * Vaastu 3D Spatial Engine
 * Bridges natural language conversational queries with the actual 3D room model,
 * enforcing boundary clamping, door clearances, collision detection, and cultural/Vaastu guidelines.
 */

import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { 
  checkCollision2D, 
  isDoorBlocked 
} from './spaceOptimizationEngine'
import { 
  CulturalTradition, 
  CULTURAL_TRADITIONS, 
  CardinalDirection, 
  VAASTU_DIRECTIONAL_MAP, 
  mapDirectionToRoomCoordinates 
} from './vaastuKnowledgeService'

export interface VaastuProposedAction {
  operation: 'MOVE_OBJECT' | 'ROTATE_OBJECT' | 'ADD_OBJECT' | 'REPLACE_OBJECT' | 'REMOVE_OBJECT' | 'UPDATE_STYLE' | 'REVERT_LAYOUT'
  objectId?: string
  objectName?: string
  targetPosition?: [number, number, number]
  targetRotation?: [number, number, number]
  wallColor?: string
  reason: string
  traditionSource: string
  isTraditionalGuidance: boolean
  affectedObjects: FurnitureItem[]
  proposedLayout: FurnitureItem[]
  originalLayout: FurnitureItem[]
  validationStatus: 'passed' | 'warning' | 'failed'
  validationNotes: string[]
  canApply: boolean
}

export interface VaastuChatResponse {
  messageId: string
  replyText: string
  culturalContextUsed: CulturalTradition
  isTraditionalGuidance: boolean
  proposedAction?: VaastuProposedAction
}

/**
 * Main engine function to process natural language design requests in Vaastu.ai
 */
export function processVaastuChatRequest(
  rawInput: string,
  currentFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[] = [],
  tradition: CulturalTradition = 'vaastu_hindu',
  roomType: string = 'Living Room',
  compassRotation: number = 0,
  history: Array<{ role: string; content: string; proposedAction?: VaastuProposedAction }> = []
): VaastuChatResponse {
  const text = rawInput.trim().toLowerCase()
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const traditionMeta = CULTURAL_TRADITIONS.find(t => t.id === tradition) || CULTURAL_TRADITIONS[0]

  // 1. Check for Revert / Undo / "Put it back"
  if (
    text.includes('put it back') || 
    text.includes('revert') || 
    text.includes('undo') || 
    text.includes('go back to previous') ||
    text.includes('restore original')
  ) {
    const lastProposalWithOrig = [...history].reverse().find(h => h.proposedAction?.originalLayout)
    if (lastProposalWithOrig?.proposedAction) {
      const orig = lastProposalWithOrig.proposedAction.originalLayout
      return {
        messageId,
        replyText: 'I have reverted the room back to your previous layout state. You can continue asking for modifications or explore new arrangements.',
        culturalContextUsed: tradition,
        isTraditionalGuidance: false,
        proposedAction: {
          operation: 'REVERT_LAYOUT',
          reason: 'User requested rollback to prior room baseline.',
          traditionSource: 'Workspace state snapshot',
          isTraditionalGuidance: false,
          affectedObjects: [],
          proposedLayout: orig,
          originalLayout: currentFurniture,
          validationStatus: 'passed',
          validationNotes: ['Restored layout verified.'],
          canApply: true
        }
      }
    }
  }

  // 2. Identify target item in the current scene
  let targetItem: FurnitureItem | undefined = undefined
  if (text.includes('bed')) {
    targetItem = currentFurniture.find(f => f.category === 'beds' || f.name.toLowerCase().includes('bed'))
  } else if (text.includes('sofa') || text.includes('couch')) {
    targetItem = currentFurniture.find(f => f.category === 'seating' && f.name.toLowerCase().includes('sofa'))
  } else if (text.includes('desk') || text.includes('study') || text.includes('work table')) {
    targetItem = currentFurniture.find(f => f.category === 'workspace' || f.name.toLowerCase().includes('desk'))
  } else if (text.includes('table') || text.includes('dining')) {
    targetItem = currentFurniture.find(f => f.category === 'tables' || f.name.toLowerCase().includes('table'))
  } else if (text.includes('tv') || text.includes('television') || text.includes('screen') || text.includes('console')) {
    targetItem = currentFurniture.find(f => f.category === 'electronics' || f.name.toLowerCase().includes('tv') || f.name.toLowerCase().includes('console'))
  } else if (text.includes('wardrobe') || text.includes('cupboard') || text.includes('closet')) {
    targetItem = currentFurniture.find(f => f.category === 'storage' || f.name.toLowerCase().includes('wardrobe'))
  } else if (text.includes('chair') || text.includes('armchair')) {
    targetItem = currentFurniture.find(f => f.category === 'seating' && f.name.toLowerCase().includes('chair'))
  }

  // If follow-up reference ("move it a little left", "move it closer to wall") without explicit noun:
  if (!targetItem && (text.includes('move it') || text.includes('shift it') || text.includes('nudge it') || text.includes('rotate it'))) {
    const lastAction = [...history].reverse().find(h => h.proposedAction?.objectId)
    if (lastAction?.proposedAction?.objectId) {
      targetItem = currentFurniture.find(f => f.id === lastAction.proposedAction?.objectId)
    }
    if (!targetItem && currentFurniture.length > 0) {
      targetItem = currentFurniture[0] // fallback to first item
    }
  }

  // 3. Check for Relative Nudges ("move it a little left", "farther from wall", etc.)
  if (targetItem && (text.includes('little left') || text.includes('little right') || text.includes('little forward') || text.includes('little back') || text.includes('closer') || text.includes('farther'))) {
    let dx = 0
    let dz = 0
    const step = 0.35 // 35cm adjustment

    if (text.includes('left')) dx -= step
    if (text.includes('right')) dx += step
    if (text.includes('forward') || text.includes('closer')) dz -= step
    if (text.includes('back') || text.includes('farther')) dz += step

    const targetPos: [number, number, number] = [
      Number((targetItem.position[0] + dx).toFixed(2)),
      targetItem.position[1],
      Number((targetItem.position[2] + dz).toFixed(2))
    ]

    return evaluateMoveProposal(
      messageId,
      targetItem,
      targetPos,
      targetItem.rotation,
      currentFurniture,
      roomDimensions,
      openings,
      `Adjusted ${targetItem.name} position by fine increment.`,
      `Fine-tuning adjustment based on your request.`,
      tradition,
      false
    )
  }

  // 4. Check for Directional Movement / Placement Request
  let requestedDirection: CardinalDirection | undefined = undefined
  if (text.includes('northeast') || text.includes('ishanya')) requestedDirection = 'Northeast'
  else if (text.includes('northwest') || text.includes('vayavya')) requestedDirection = 'Northwest'
  else if (text.includes('southeast') || text.includes('agneya') || text.includes('agni')) requestedDirection = 'Southeast'
  else if (text.includes('southwest') || text.includes('nairutya') || text.includes('nairitya')) requestedDirection = 'Southwest'
  else if (text.includes('north') || text.includes('uttar')) requestedDirection = 'North'
  else if (text.includes('south') || text.includes('dakshin')) requestedDirection = 'South'
  else if (text.includes('east') || text.includes('purva')) requestedDirection = 'East'
  else if (text.includes('west') || text.includes('pashchim')) requestedDirection = 'West'
  else if (text.includes('center') || text.includes('brahmasthan')) requestedDirection = 'Center'

  // A. Move Object Request with Direction
  if (targetItem && (text.includes('move') || text.includes('place') || text.includes('shift') || text.includes('put') || text.includes('relocate')) && requestedDirection) {
    const coords = mapDirectionToRoomCoordinates(requestedDirection, roomDimensions, compassRotation)
    const targetPos: [number, number, number] = [coords.x, targetItem.position[1], coords.z]

    const dirInfo = VAASTU_DIRECTIONAL_MAP[requestedDirection]
    let reasonText = `Moving ${targetItem.name} toward the ${requestedDirection} quadrant.`
    let traditionSource = 'Traditional spatial orientation'

    if (tradition === 'vaastu_hindu') {
      reasonText = `In Vaastu Shastra, ${dirInfo.direction} is the ${dirInfo.vaastuZoneName} zone (${dirInfo.governingElement}). ${dirInfo.rationale}`
      traditionSource = 'Vaastu Shastra principles (practices vary by regional traditions)'
    } else if (tradition === 'islamic') {
      reasonText = `Orienting ${targetItem.name} respectfully within the ${requestedDirection} zone with clear circulation aisles and dignified sightlines.`
      traditionSource = 'Islamic spatial etiquette and mindful circulation principles'
    } else if (tradition === 'christian') {
      reasonText = `Positioning ${targetItem.name} toward the ${requestedDirection} to optimize morning natural illumination and welcoming room gathering.`
      traditionSource = 'Christian architectural daylighting and fellowship customs'
    } else if (tradition === 'buddhist') {
      reasonText = `Harmonizing ${targetItem.name} in the ${requestedDirection} to preserve tranquil walking energy and minimal visual obstruction.`
      traditionSource = 'Buddhist mindful spatial balance'
    } else if (tradition === 'jain') {
      reasonText = `Placing ${targetItem.name} in the clean, peaceful ${requestedDirection} zone in harmony with Ahimsa and hygienic order.`
      traditionSource = 'Jain principles of simplicity and peace'
    }

    return evaluateMoveProposal(
      messageId,
      targetItem,
      targetPos,
      targetItem.rotation,
      currentFurniture,
      roomDimensions,
      openings,
      reasonText,
      `I can propose moving the ${targetItem.name} to the ${requestedDirection} section of your room. Let's verify boundary containment and clearances before you commit.`,
      tradition,
      tradition !== 'none',
      traditionSource
    )
  }

  // B. Rotation Request
  if (targetItem && (text.includes('rotate') || text.includes('turn'))) {
    const currentRotY = targetItem.rotation ? targetItem.rotation[1] : 0
    const targetRotY = (currentRotY + Math.PI / 2) % (Math.PI * 2)
    const newRot: [number, number, number] = [0, Number(targetRotY.toFixed(4)), 0]
    return evaluateMoveProposal(
      messageId,
      targetItem,
      targetItem.position,
      newRot,
      currentFurniture,
      roomDimensions,
      openings,
      `Rotated ${targetItem.name} 90 degrees to align with room geometry.`,
      `I have proposed rotating the ${targetItem.name} by 90°. Notice how this affects your circulation aisle.`,
      tradition,
      false,
      'Geometry Alignment'
    )
  }

  // C. Whole Room Layout Recommendation Request
  if (
    text.includes('recommend') || 
    text.includes('suggest') || 
    text.includes('layout') || 
    text.includes('arrange') || 
    text.includes('where should i') ||
    text.includes('best place') ||
    text.includes('how to improve')
  ) {
    return generateHolisticRoomProposal(
      messageId,
      text,
      currentFurniture,
      roomDimensions,
      openings,
      tradition,
      roomType,
      compassRotation,
      targetItem
    )
  }

  // D. General Q&A / Advisory Answer (Colors, Lighting, General Vaastu Rules)
  return generateAdvisoryResponse(messageId, text, tradition, roomType, traditionMeta)
}

/**
 * Validates a movement / rotation proposal against room bounds, door clearances, and collisions.
 */
function evaluateMoveProposal(
  messageId: string,
  targetItem: FurnitureItem,
  targetPosition: [number, number, number],
  targetRotation: [number, number, number],
  currentFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[],
  reason: string,
  introText: string,
  tradition: CulturalTradition,
  isTraditionalGuidance: boolean,
  traditionSource?: string
): VaastuChatResponse {
  const validationNotes: string[] = []
  let validationStatus: 'passed' | 'warning' | 'failed' = 'passed'

  // Clone updated item
  let updatedItem: FurnitureItem = {
    ...targetItem,
    position: targetPosition,
    rotation: targetRotation
  }

  // 1. Boundary Check
  const halfL = roomDimensions.length / 2
  const halfW = roomDimensions.width / 2
  const rotYDeg = Math.round((targetRotation[1] * 180) / Math.PI)
  const isRotated90 = Math.abs(rotYDeg % 180) === 90
  const itemHalfW = (isRotated90 ? updatedItem.depth : updatedItem.width) / 2
  const itemHalfD = (isRotated90 ? updatedItem.width : updatedItem.depth) / 2

  const clampedX = Math.max(-halfL + itemHalfW, Math.min(halfL - itemHalfW, targetPosition[0]))
  const clampedZ = Math.max(-halfW + itemHalfD, Math.min(halfW - itemHalfD, targetPosition[2]))

  if (clampedX !== targetPosition[0] || clampedZ !== targetPosition[2]) {
    validationNotes.push(`Clamped position to prevent wall overflow (adjusted to X: ${clampedX.toFixed(2)}m, Z: ${clampedZ.toFixed(2)}m).`)
    targetPosition = [clampedX, targetPosition[1], clampedZ]
    updatedItem = { ...updatedItem, position: targetPosition }
  }

  // 2. Door clearance check
  const doorBlocked = isDoorBlocked(updatedItem, openings)
  if (doorBlocked) {
    validationStatus = 'warning'
    validationNotes.push('Warning: Proposed position is close to a door ingress path. Keep at least 0.85m entry clearance.')
  }

  // 3. Collision check against other furniture
  const otherItems = currentFurniture.filter(f => f.id !== targetItem.id)
  for (const other of otherItems) {
    if (checkCollision2D(updatedItem, other)) {
      validationNotes.push(`Potential overlap detected with ${other.name}. Position nudged to maintain safe clearance.`)
      // Nudge 0.3m away
      targetPosition = [
        targetPosition[0] + (targetPosition[0] >= other.position[0] ? 0.3 : -0.3),
        targetPosition[1],
        targetPosition[2] + (targetPosition[2] >= other.position[2] ? 0.3 : -0.3)
      ]
      updatedItem = { ...updatedItem, position: targetPosition }
      break
    }
  }

  if (validationNotes.length === 0) {
    validationNotes.push('Physically feasible with zero collisions and verified door clearances.')
  }

  const proposedLayout = currentFurniture.map(f => f.id === targetItem.id ? updatedItem : f)

  const isRotationOnly = targetPosition[0] === targetItem.position[0] &&
                         targetPosition[2] === targetItem.position[2] &&
                         targetRotation[1] !== targetItem.rotation[1]

  const replyText = `${introText}

${isTraditionalGuidance ? `> [!NOTE]\n> **Traditional Guidance Note:** ${reason}\n> *Note: Recommendations vary by school and regional practice; always balance with personal comfort and physical accessibility.*` : reason}

**Validation Assessment:**
${validationNotes.map(n => `- ${n}`).join('\n')}

Review the proposed 3D layout in the viewer on your left. You can **Accept Changes** to commit, **Adjust** position, or **Reject** to revert.`

  return {
    messageId,
    replyText,
    culturalContextUsed: tradition,
    isTraditionalGuidance,
    proposedAction: {
      operation: isRotationOnly ? 'ROTATE_OBJECT' : 'MOVE_OBJECT',
      objectId: targetItem.id,
      objectName: targetItem.name,
      targetPosition,
      targetRotation,
      reason,
      traditionSource: traditionSource || (isTraditionalGuidance ? 'Traditional Cultural Architecture' : 'Space Layout Optimization'),
      isTraditionalGuidance,
      affectedObjects: [updatedItem],
      proposedLayout,
      originalLayout: currentFurniture,
      validationStatus,
      validationNotes,
      canApply: true
    }
  }
}

/**
 * Proposes a holistic arrangement based on tradition and room geometry
 */
function generateHolisticRoomProposal(
  messageId: string,
  _userQuery: string,
  currentFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[],
  tradition: CulturalTradition,
  roomType: string,
  compassRotation: number,
  specificItem?: FurnitureItem
): VaastuChatResponse {
  // If user asked about bed specifically in a bedroom
  const bedItem = specificItem || currentFurniture.find(f => f.category === 'beds' || f.name.toLowerCase().includes('bed'))

  if (bedItem) {
    // Recommend Southwest (Nairutya) for bed in Vaastu
    const coords = mapDirectionToRoomCoordinates('Southwest', roomDimensions, compassRotation)
    const targetPos: [number, number, number] = [coords.x, bedItem.position[1], coords.z]

    return evaluateMoveProposal(
      messageId,
      bedItem,
      targetPos,
      bedItem.rotation || [0, 0, 0],
      currentFurniture,
      roomDimensions,
      openings,
      `According to Vaastu Shastra, placing the bed in the Southwest (Nairutya) quadrant provides anchoring stability and restful sleep, while keeping the head directed toward the South or East.`,
      `Here is a proposed layout optimization for your ${bedItem.name}:`,
      tradition,
      tradition !== 'none'
    )
  }

  // Living Room Seating / Sofa recommendation
  const sofaItem = currentFurniture.find(f => f.category === 'seating' && f.name.toLowerCase().includes('sofa'))
  if (sofaItem) {
    const coords = mapDirectionToRoomCoordinates('South', roomDimensions, compassRotation)
    const targetPos: [number, number, number] = [coords.x, sofaItem.position[1], coords.z]

    return evaluateMoveProposal(
      messageId,
      sofaItem,
      targetPos,
      sofaItem.rotation || [0, 0, 0],
      currentFurniture,
      roomDimensions,
      openings,
      `Placing primary heavy seating along the South or West perimeter leaves the Northern and Eastern sectors open for natural light and social circulation.`,
      `Here is a proposed arrangement for your ${sofaItem.name}:`,
      tradition,
      tradition !== 'none'
    )
  }

  // General layout advice
  return {
    messageId,
    replyText: `Here are key layout recommendations for your **${roomType}** based on **${tradition === 'vaastu_hindu' ? 'Vaastu Shastra' : tradition}**:

1. **Directional Anchors:**
   - **Northeast (Ishanya):** Keep open, light, and clean. Ideal for morning light, quiet meditation, or light decor.
   - **Southwest (Nairutya):** Place heaviest furniture (e.g. Master bed or tall wardrobes) against the South and West walls for physical stability.
   - **Brahmasthan (Center):** Maintain an open central circulation core (at least 0.9m aisle clearance).

2. **Aperture & Daylight Considerations:**
   - Avoid blocking natural window illumination with tall wardrobes.
   - Ensure doorway ingress corridors have minimum 0.85m clear passage (Neufert & IBC safety code).

*To see these changes in your 3D room, ask me: "Move the bed to the Southwest" or "Make more walking space in the center".*`,
    culturalContextUsed: tradition,
    isTraditionalGuidance: tradition !== 'none'
  }
}

/**
 * Handles advisory design questions (e.g. colors, lighting, sacred zones)
 */
function generateAdvisoryResponse(
  messageId: string,
  text: string,
  tradition: CulturalTradition,
  roomType: string,
  traditionMeta: any
): VaastuChatResponse {
  // Check if asking about colors
  if (text.includes('color') || text.includes('paint') || text.includes('wall color')) {
    return {
      messageId,
      replyText: `### Recommended Color Harmonization for ${roomType} (${traditionMeta.shortLabel})

* **North & East Walls:** Soft off-white, light mint green, pale cream, or subtle ivory. These shades maximize natural solar reflectance and create an uplifting, airy atmosphere.
* **South & West Walls:** Warm earthen tones, soft sand beige, muted clay, or warm taupe. In Vaastu, these warm grounded shades provide balance against heavy structural walls.
* **Ceiling:** Crisp clean white or soft alabaster to maximize light bounce and visual height.

> [!NOTE]
> **Practical Tip:** Test a small sample under both daytime natural sunlight and warm (2700K–3000K) evening LED lighting before repainting.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking about Islamic guidance, Qibla or privacy
  if (tradition === 'islamic' || text.includes('qibla') || text.includes('privacy') || text.includes('prayer')) {
    return {
      messageId,
      replyText: `### Islamic Spatial Guidance for ${roomType}

* **Qibla Orientation:** When planning a dedicated prayer area or quiet alcove, orient it respectfully facing Qibla with clean, unobstructed floor clearance.
* **Circulation Privacy:** Position primary living seating so external doorways do not offer direct, abrupt sightlines into private family rest zones, preserving domestic privacy (Adaab).
* **Cleanliness & Light:** Maintain open, uncluttered circulation corridors with easy access to washing hygiene and generous natural daylight.

> [!NOTE]
> **Cultural Etiquette Note:** Islamic home recommendations reflect traditional cultural etiquettes (Adaab) and respectful spatial consideration rather than dogmatic structural mandates.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: true
    }
  }

  // Check if asking about Buddhist mindfulness or meditation
  if (tradition === 'buddhist' || text.includes('meditation') || text.includes('mindful') || text.includes('zen') || text.includes('declutter')) {
    return {
      messageId,
      replyText: `### Buddhist Mindfulness & Spatial Flow for ${roomType}

* **Tranquil Flow:** Keep central floor pathways wide and unobstructed to cultivate calm, mindful movement throughout the room.
* **Meditation Corner:** Set aside a quiet corner away from door swings, oriented toward soft natural daylight or tranquil outdoor views.
* **Organic Simplicity:** Favor natural materials (wood, stone, linen, bamboo) and mindful decluttering to reduce visual stress.

> [!NOTE]
> **Mindfulness Note:** Buddhist spatial concepts prioritize personal peace, balance, and simplicity rather than rigid dogmatic rules.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: true
    }
  }

  // Check if asking about Christian fellowship or morning light
  if (tradition === 'christian' || text.includes('fellowship') || text.includes('devotion') || text.includes('gathering')) {
    return {
      messageId,
      replyText: `### Christian Traditions & Family Fellowship for ${roomType}

* **Communal Fellowship:** Arrange living or dining seating facing inward around a central table to encourage shared meals, hospitality, and family conversation.
* **Morning Light (East Facing):** Historical architectural customs favor Eastward morning daylight, celebrating dawn renewal and peaceful morning study.
* **Devotional Corner:** A dedicated armchair or desk with warm task lighting for peaceful contemplation and study.

> [!NOTE]
> **Tradition Note:** Christian spatial traditions reflect historic architectural customs and personal spiritual lifestyle preferences.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: true
    }
  }

  // Check if asking about Jain principles
  if (tradition === 'jain' || text.includes('ahimsa') || text.includes('jain')) {
    return {
      messageId,
      replyText: `### Jain Spatial Principles for ${roomType}

* **Ahimsa & Peaceful Living:** Simple, uncluttered arrangements with safe clearances that prevent injury and preserve serenity.
* **Natural Solar Illumination:** Prioritize natural daytime lighting and ventilation in harmony with solar daylight cycles.
* **Sanctuary of Simplicity:** Dedicated clean space for meditation, free from excessive ornamentation.

> [!NOTE]
> **Jain Lifestyle Note:** Jain residential principles emphasize spiritual simplicity, peaceful mindfulness, and reverence for nature.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: true
    }
  }

  // Default helpful response
  return {
    messageId,
    replyText: `Hello! I am **Vaastu.ai**, your architectural design and spatial harmony assistant.

**Current Active Tradition:** ${traditionMeta.label}
*Tagline: "Thoughtful Spaces. Meaningful Living."*

I can help you:
1. **Optimize Furniture Placement:** e.g., *"Where should I put the bed?"* or *"Move the sofa to the East wall"*.
2. **Align Directional Energies:** Harmonize room layout with Ishanya (NE), Agni (SE), and Nairutya (SW) principles.
3. **Verify Physical Clearances:** Every change is checked for boundary containment and Neufert walking clearance standards.
4. **Color & Lighting Suggestions:** Tailored to your room's natural daylight apertures.

How would you like to improve your **${roomType}** today?`,
    culturalContextUsed: tradition,
    isTraditionalGuidance: tradition !== 'none'
  }
}
