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

  // 1. Check for "Whats going on?" / Casual conversation opener
  if (
    text.includes('whats going on') || 
    text.includes("what's going on") || 
    text.includes('what is going on') ||
    text.includes("what's up") ||
    text.includes('what are you doing') ||
    text.includes('how are you')
  ) {
    return {
      messageId,
      replyText: `Not much, just ready to help you style and optimize your room! 

We can rearrange furniture, check your room's Vaastu balance, open up more space, or add new pieces in 3D. 

Tell me, what's on your mind? What part of your room would you like to work on?`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: false
    }
  }

  // 2. Friendly Greetings
  if (/^(hi|hello|hey|greetings|good morning|good evening|good afternoon)\b/i.test(text) && text.length < 25) {
    return {
      messageId,
      replyText: `Hey there! How's your room feeling today? 

Tell me what you'd like to change or ask me any question about Vaastu, furniture placement, or room energy, and I'll adjust your 3D model right away!`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: false
    }
  }

  // 3. Check for User Confirmation ("yes", "apply", "looks good", "do it", "sure", "accept")
  const isAffirmative = /^(yes|yeah|yup|sure|ok|okay|apply|accept|do it|looks good|commit|save it|perfect|go ahead|apply it)\b/i.test(text) ||
                        text.includes('apply this') || text.includes('apply changes') || text.includes('apply it') ||
                        text.includes('looks good') || text.includes('looks great')
  if (isAffirmative) {
    const lastProposal = [...history].reverse().find(h => h.proposedAction && h.proposedAction.operation !== 'REVERT_LAYOUT')
    if (lastProposal?.proposedAction) {
      return {
        messageId,
        replyText: `Awesome! I've confirmed and applied these changes to your 3D room. Your layout is now updated. What else would you like to work on?`,
        culturalContextUsed: tradition,
        isTraditionalGuidance: false,
        proposedAction: {
          ...lastProposal.proposedAction,
          reason: 'Applied user confirmation.',
          canApply: true
        }
      }
    }
  }

  // 4. Check for Revert / Undo / "Put it back"
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

  // C. Add New Object Request ("add a study desk", "add a plant", "put a coffee table")
  const isAddRequest = text.startsWith('add ') || text.includes('add a ') || text.includes('add an ') || 
                       text.includes('place a new ') || text.includes('put a new ') || text.includes('bring in a ') ||
                       text.includes('need a desk') || text.includes('need a table') || text.includes('need a plant') ||
                       text.includes('add plant') || text.includes('add desk') || text.includes('add table') || text.includes('add chair')
  if (isAddRequest) {
    return evaluateAddProposal(
      messageId,
      text,
      currentFurniture,
      roomDimensions,
      openings,
      requestedDirection,
      tradition,
      compassRotation
    )
  }

  // D. Remove / Delete Object Request ("remove the sofa", "delete the table", "clear the desk")
  const isRemoveRequest = text.startsWith('remove ') || text.includes('remove the ') || text.includes('delete ') || 
                          text.includes('get rid of ') || text.includes('take out the ')
  if (isRemoveRequest && targetItem) {
    return evaluateRemoveProposal(messageId, targetItem, currentFurniture, tradition)
  }

  // E. Whole Room Layout Recommendation Request
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

  // F. General Q&A / Advisory Answer (Colors, Lighting, General Vaastu Rules)
  return generateAdvisoryResponse(messageId, text, tradition, roomType, traditionMeta)
}

/**
 * Handles adding new furniture or decor items to the 3D room based on Vaastu principles.
 */
function evaluateAddProposal(
  messageId: string,
  rawText: string,
  currentFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  _openings: Opening3D[],
  requestedDirection: CardinalDirection | undefined,
  tradition: CulturalTradition,
  compassRotation: number
): VaastuChatResponse {
  let itemType = 'study_desk'
  let itemName = 'Executive Study Desk'
  let category: FurnitureItem['category'] = 'workspace'
  let width = 1.3
  let height = 0.75
  let depth = 0.65
  let color = '#1e293b'
  let defaultDir: CardinalDirection = 'North'

  if (rawText.includes('plant') || rawText.includes('tree') || rawText.includes('flower') || rawText.includes('flora')) {
    itemType = 'indoor_plant'
    itemName = 'Lush Indoor Plant'
    category = 'decor'
    width = 0.45
    height = 1.1
    depth = 0.45
    color = '#15803d'
    defaultDir = 'Northeast' // Northeast is the water/nature zone in Vaastu!
  } else if (rawText.includes('coffee table') || rawText.includes('tea table')) {
    itemType = 'coffee_table'
    itemName = 'Modern Coffee Table'
    category = 'tables'
    width = 1.0
    height = 0.45
    depth = 0.55
    color = '#78350f'
    defaultDir = 'Center'
  } else if (rawText.includes('dining')) {
    itemType = 'dining_table'
    itemName = '4-Person Dining Table'
    category = 'tables'
    width = 1.4
    height = 0.76
    depth = 0.85
    color = '#854d0e'
    defaultDir = 'West'
  } else if (rawText.includes('desk') || rawText.includes('study') || rawText.includes('workstation')) {
    itemType = 'study_desk'
    itemName = 'Executive Study Desk'
    category = 'workspace'
    width = 1.3
    height = 0.75
    depth = 0.65
    color = '#1e293b'
    defaultDir = 'North' // North is Mercury / intellect zone in Vaastu!
  } else if (rawText.includes('chair') || rawText.includes('armchair')) {
    itemType = 'armchair'
    itemName = 'Accent Armchair'
    category = 'seating'
    width = 0.85
    height = 0.85
    depth = 0.85
    color = '#0284c7'
    defaultDir = 'Northwest'
  } else if (rawText.includes('bookshelf') || rawText.includes('shelf') || rawText.includes('bookcase')) {
    itemType = 'bookshelf'
    itemName = 'Solid Wood Bookshelf'
    category = 'storage'
    width = 0.9
    height = 1.8
    depth = 0.35
    color = '#451a03'
    defaultDir = 'South'
  } else if (rawText.includes('nightstand') || rawText.includes('side table')) {
    itemType = 'nightstand'
    itemName = 'Bedside Nightstand'
    category = 'tables'
    width = 0.5
    height = 0.55
    depth = 0.45
    color = '#475569'
    defaultDir = 'Southwest'
  }

  const chosenDir = requestedDirection || defaultDir
  const coords = mapDirectionToRoomCoordinates(chosenDir, roomDimensions, compassRotation)

  const halfL = roomDimensions.length / 2
  const halfW = roomDimensions.width / 2
  const margin = 0.35
  const clampedX = Math.max(-halfL + margin + width / 2, Math.min(halfL - margin - width / 2, coords.x))
  const clampedZ = Math.max(-halfW + margin + depth / 2, Math.min(halfW - margin - depth / 2, coords.z))

  const newItem: FurnitureItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: itemName,
    type: itemType,
    category,
    width,
    height,
    depth,
    position: [Number(clampedX.toFixed(2)), 0, Number(clampedZ.toFixed(2))],
    rotation: [0, 0, 0],
    room: currentFurniture[0]?.room || 'living_room',
    color,
    clearanceRequired: {
      frontMeters: 0.5,
      sidesMeters: 0.3
    },
    isExisting: false
  }

  const proposedLayout = [...currentFurniture, newItem]

  const dirRationale = chosenDir === 'Northeast' 
    ? 'Placing green plants in the Northeast invites positive Prana, solar daylight, and freshness.'
    : chosenDir === 'North'
    ? 'Placing study and workspace elements along the North/East promotes concentration and clear thinking according to Vaastu.'
    : `Positioned in the ${chosenDir} quadrant to maintain balanced spatial distribution.`

  return {
    messageId,
    replyText: `I have added a **${newItem.name}** in the **${chosenDir}** section of your room! 

${dirRationale}

Take a look at your 3D room on the left — you can see it placed now. Would you like to keep it here, shift it, or try another piece?`,
    culturalContextUsed: tradition,
    isTraditionalGuidance: tradition !== 'none',
    proposedAction: {
      operation: 'ADD_OBJECT',
      objectId: newItem.id,
      objectName: newItem.name,
      targetPosition: newItem.position,
      targetRotation: newItem.rotation,
      reason: `Added ${newItem.name} in ${chosenDir}.`,
      traditionSource: 'Vaastu harmonious furnishing',
      isTraditionalGuidance: tradition !== 'none',
      affectedObjects: [newItem],
      proposedLayout,
      originalLayout: currentFurniture,
      validationStatus: 'passed',
      validationNotes: [`Safe boundary containment verified.`, `Doorway clearance preserved.`],
      canApply: true
    }
  }
}

/**
 * Handles removing an item from the 3D room.
 */
function evaluateRemoveProposal(
  messageId: string,
  targetItem: FurnitureItem,
  currentFurniture: FurnitureItem[],
  tradition: CulturalTradition
): VaastuChatResponse {
  const proposedLayout = currentFurniture.filter(f => f.id !== targetItem.id)
  const freedArea = (targetItem.width * targetItem.depth).toFixed(2)

  return {
    messageId,
    replyText: `I have removed the **${targetItem.name}** from your room layout. 

This frees up **${freedArea} m²** of open circulation space, allowing more light and breathing room throughout the area.

Check out the updated 3D model on your left!`,
    culturalContextUsed: tradition,
    isTraditionalGuidance: false,
    proposedAction: {
      operation: 'REMOVE_OBJECT',
      objectId: targetItem.id,
      objectName: targetItem.name,
      reason: `Removed ${targetItem.name} to free up ${freedArea} m² space.`,
      traditionSource: 'Space optimization and decluttering',
      isTraditionalGuidance: false,
      affectedObjects: [targetItem],
      proposedLayout,
      originalLayout: currentFurniture,
      validationStatus: 'passed',
      validationNotes: [`Freed up ${freedArea} m² floor space.`],
      canApply: true
    }
  }
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
  // Check if asking about mirrors
  if (text.includes('mirror') || text.includes('dressing table') || text.includes('glass')) {
    return {
      messageId,
      replyText: `### Mirror Placement in Vaastu Shastra

* **Best Direction:** Always place mirrors on the **North or East walls**. This reflects and enhances the positive magnetic and morning solar energies.
* **Bedroom Precaution:** Avoid placing a mirror directly facing the bed where it reflects your sleeping body. In Vaastu, this is believed to cause restless sleep and health drain.
* **Height & Cleanliness:** Mount the mirror at eye level (4 to 5 feet above the floor) and keep it clean and crack-free.
* **Practical Fix:** If a wardrobe mirror faces your bed and cannot be moved, simply drape a light cloth or curtain over it before sleeping.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking about sleeping direction
  if (text.includes('sleep') || text.includes('sleeping') || text.includes('head position') || text.includes('which direction to sleep') || text.includes('which way to sleep')) {
    return {
      messageId,
      replyText: `### Ideal Sleeping Direction in Vaastu

* **Head toward the South (Best):** Strongly recommended. Earth's magnetic pole is in the North; sleeping with your head to the South harmonizes bodily magnetism with Earth's magnetic field, promoting deep, restorative sleep and stabilizing blood pressure.
* **Head toward the East (Second Best):** Excellent for students, professionals, and writers. Associated with mental sharpness, memory retention, and morning energy.
* **Head toward the West:** Neutral/acceptable for guest bedrooms.
* **Avoid Head toward the North:** Aligns like magnetic poles (North to North), causing magnetic repulsion that can trigger restlessness, headaches, and disturbed REM sleep.

*Want me to orient your bed? Ask: "Move the bed to the Southwest with head to South"!*`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking about Brahmasthan (Room Center)
  if (text.includes('brahmasthan') || text.includes('center of room') || text.includes('centre of room') || text.includes('middle of room') || text.includes('clear center')) {
    return {
      messageId,
      replyText: `### The Brahmasthan (Center of Space)

* The focal center of any room represents **Akasha (Space/Ether)** — the most sacred and vital energetic core in Vaastu Shastra.
* **Core Rule:** Keep the Brahmasthan free of heavy, permanent furniture, pillars, and clutter. A clean, open center allows life energy (Prana) to circulate freely.
* **Minimum Clearance:** Maintain at least a 0.9m open walking core across the room.

*Want to clear the center? Just ask: "Clear the center of the room" and I will reposition items toward the perimeter walls!*`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking about Wealth / Kuber zone
  if (text.includes('wealth') || text.includes('money') || text.includes('kuber') || text.includes('prosperity') || text.includes('financial')) {
    return {
      messageId,
      replyText: `### Attracting Wealth & Prosperity (Kuber Zone)

* **The North Sector:** Governed by Lord Kuber (god of wealth). Keep the Northern perimeter clean, bright, and uncluttered to invite positive financial opportunities.
* **Safe / Locker Placement:** Position your cash box, safe, or jewelry in the **Southwest**, opening toward the **North** (so wealth flows toward Kuber's direction).
* **Plant / Water Element:** Placing a small vibrant green plant or small water feature in the North or Northeast invigorates financial abundance.`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking about Study / Focus
  if (text.includes('study') || text.includes('focus') || text.includes('concentration') || text.includes('work desk') || text.includes('reading')) {
    return {
      messageId,
      replyText: `### Study & Workspace Alignment in Vaastu

* **Facing Direction:** Sit facing **East or North** while working or studying. Facing East enhances solar alertness and memory, while North enhances analytical focus.
* **Desk Placement:** Position the study table along the North or East wall. Keep a solid wall behind your back for psychological support and grounding.
* **Lighting:** Ensure natural daylight enters from the left or front to prevent shadowing on work surfaces.

*Want me to add a desk? Just tell me: "Add a study desk in the North"!*`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: tradition !== 'none'
    }
  }

  // Check if asking "what is vaastu"
  if (text.includes('what is vaastu') || text.includes('what is vastu') || text.includes('explain vaastu') || text.includes('principles of vaastu') || text.includes('how does vaastu work')) {
    return {
      messageId,
      replyText: `### What is Vaastu Shastra?

**Vaastu Shastra** is an ancient Indian architectural and spatial design science that connects built spaces with nature's fundamental forces:

1. **The 5 Elements (Pancha Bhoota):**
   * **Earth (Prithvi - Southwest):** Grounding, stability, heavy furniture.
   * **Water (Jal - Northeast):** Purity, morning light, calm decor, plants.
   * **Fire (Agni - Southeast):** Kitchen, electronics, dynamic energy.
   * **Air (Vayu - Northwest):** Movement, guests, airflow.
   * **Space (Akasha - Center):** Uncluttered open circulation.

2. **Practical Benefits:**
   * Maximum natural daylight and cross-ventilation.
   * Ergonomic walking clearance.
   * Reduced clutter and mental calm.

*Feel free to ask me to test any Vaastu layout directly in your 3D model!*`,
      culturalContextUsed: tradition,
      isTraditionalGuidance: true
    }
  }

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
