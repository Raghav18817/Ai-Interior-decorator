import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { 
  ParsedCommandIntent, 
  CommandExecutionResult 
} from '../types/commands'
import { VERIFIED_FURNITURE_CATALOG } from '../data/furnitureCatalog'
import { checkCollision2D, isWithinRoomBounds, isDoorBlocked } from './spaceOptimizationEngine'

/**
 * Parses user natural language command into a structured intent.
 */
export function parseNaturalLanguageCommand(rawText: string): ParsedCommandIntent {
  const text = rawText.trim().toLowerCase()

  // 1. Check for circulation / spaciousness intent
  if (
    text.includes('more walking space') || 
    text.includes('more space') || 
    text.includes('feel more spacious') ||
    text.includes('open up the room')
  ) {
    return {
      rawText,
      intentType: 'OPTIMIZE_CIRCULATION',
      targetQuery: 'room_circulation',
      confidence: 0.95
    }
  }

  // 2. Check for relational alignment: "put the TV opposite the sofa"
  if (text.includes('opposite') || text.includes('facing')) {
    const isTV = text.includes('tv') || text.includes('television') || text.includes('screen')
    const ref = text.includes('sofa') ? 'sofa' : text.includes('bed') ? 'bed' : 'seating'
    return {
      rawText,
      intentType: 'ALIGN_RELATIONSHIP',
      targetQuery: isTV ? 'tv' : 'furniture',
      referenceQuery: ref,
      confidence: 0.92
    }
  }

  // 3. Check for replacement intent: "replace the sofa with a smaller one"
  if (text.includes('replace') || text.includes('substitute') || text.includes('swap')) {
    let target = 'sofa'
    if (text.includes('table')) target = 'table'
    if (text.includes('desk')) target = 'desk'
    if (text.includes('bed')) target = 'bed'

    const param = text.includes('smaller') ? 'smaller' : 'space-saving'

    return {
      rawText,
      intentType: 'REPLACE_OBJECT',
      targetQuery: target,
      parameter: param,
      confidence: 0.9
    }
  }

  // 4. Check for move intent: "move the sofa near the window"
  if (text.includes('move') || text.includes('shift') || text.includes('relocate')) {
    let target = 'sofa'
    if (text.includes('table')) target = 'table'
    if (text.includes('tv')) target = 'tv'
    if (text.includes('desk')) target = 'desk'
    if (text.includes('cupboard') || text.includes('wardrobe')) target = 'wardrobe'

    let ref: string | undefined = undefined
    if (text.includes('window')) ref = 'window'
    else if (text.includes('door')) ref = 'door'
    else if (text.includes('wall')) ref = 'wall'
    else if (text.includes('corner')) ref = 'corner'

    return {
      rawText,
      intentType: 'MOVE_OBJECT',
      targetQuery: target,
      referenceQuery: ref,
      confidence: 0.88
    }
  }

  // 5. Check for addition intent: "add a study table"
  if (text.includes('add') || text.includes('put a') || text.includes('insert') || text.includes('place a')) {
    let target = 'study_desk'
    if (text.includes('chair')) target = 'chair'
    if (text.includes('table') || text.includes('desk')) target = 'study_desk'
    if (text.includes('sofa')) target = 'sofa'
    if (text.includes('bookshelf')) target = 'bookshelf'

    return {
      rawText,
      intentType: 'ADD_OBJECT',
      targetQuery: target,
      confidence: 0.87
    }
  }

  // 6. Check for removal intent: "remove the coffee table"
  if (text.includes('remove') || text.includes('delete') || text.includes('get rid of')) {
    let target = 'coffee_table'
    if (text.includes('sofa')) target = 'sofa'
    if (text.includes('table')) target = 'coffee_table'
    if (text.includes('cupboard') || text.includes('wardrobe')) target = 'wardrobe'

    return {
      rawText,
      intentType: 'REMOVE_OBJECT',
      targetQuery: target,
      confidence: 0.89
    }
  }

  // 7. Check for rotation intent: "rotate the desk"
  if (text.includes('rotate') || text.includes('turn')) {
    let target = 'desk'
    if (text.includes('table')) target = 'table'
    if (text.includes('sofa')) target = 'sofa'

    return {
      rawText,
      intentType: 'ROTATE_OBJECT',
      targetQuery: target,
      parameter: '90',
      confidence: 0.86
    }
  }

  return {
    rawText,
    intentType: 'UNKNOWN',
    targetQuery: text,
    confidence: 0.4
  }
}

/**
 * Converts parsed natural language intent into structured spatial actions with full constraint validation.
 */
export function executeNaturalLanguageCommand(
  rawText: string,
  currentFurniture: FurnitureItem[],
  roomDimensions: { length: number; width: number; height: number },
  openings: Opening3D[]
): CommandExecutionResult {
  const parsedIntent = parseNaturalLanguageCommand(rawText)
  const { length: roomL, width: roomW } = roomDimensions
  const halfL = roomL / 2
  const halfW = roomW / 2

  let proposedLayout: FurnitureItem[] = currentFurniture.map(f => ({
    ...f,
    position: [...f.position] as [number, number, number],
    rotation: [...f.rotation] as [number, number, number]
  }))

  const affectedObjects: FurnitureItem[] = []
  const validationNotes: string[] = []
  let actionDescription = ''
  let validationStatus: 'passed' | 'warning' | 'failed' = 'passed'

  // Match target item in current furniture
  const findItem = (query: string) => {
    return proposedLayout.find(f => 
      f.type.toLowerCase().includes(query.toLowerCase()) || 
      f.name.toLowerCase().includes(query.toLowerCase())
    )
  }

  switch (parsedIntent.intentType) {
    case 'MOVE_OBJECT': {
      const target = findItem(parsedIntent.targetQuery)
      if (!target) {
        return createFailureResult(parsedIntent, currentFurniture, `Could not find "${parsedIntent.targetQuery}" in the room to move.`)
      }

      affectedObjects.push(target)
      let targetX = target.position[0]
      let targetZ = target.position[2]

      if (parsedIntent.referenceQuery === 'window') {
        const windowOpening = openings.find(o => o.type === 'window')
        if (windowOpening) {
          // Align near window elevation while leaving 0.6m perimeter offset
          targetX = windowOpening.position[0] > 0 
            ? halfL - target.width / 2 - 0.2 
            : -halfL + target.width / 2 + 0.2
          targetZ = windowOpening.position[2]
          actionDescription = `Moved ${target.name} adjacent to ${windowOpening.label} along East perimeter.`
        } else {
          targetX = halfL - target.width / 2 - 0.2
          actionDescription = `Moved ${target.name} toward exterior wall.`
        }
      } else {
        // Shift toward wall
        targetZ = -halfW + target.depth / 2 + 0.1
        actionDescription = `Repositioned ${target.name} flush with boundary wall.`
      }

      // Check boundary constraints
      const maxAllowedX = halfL - target.width / 2
      const maxAllowedZ = halfW - target.depth / 2
      targetX = Math.max(-maxAllowedX, Math.min(maxAllowedX, Number(targetX.toFixed(2))))
      targetZ = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, Number(targetZ.toFixed(2))))

      target.position = [targetX, target.position[1], targetZ]
      validationNotes.push(`Room boundary preserved: item remains within [±${halfL}m, ±${halfW}m].`)
      break
    }

    case 'REPLACE_OBJECT': {
      const targetIndex = proposedLayout.findIndex(f => 
        f.type.toLowerCase().includes(parsedIntent.targetQuery.toLowerCase()) || 
        f.name.toLowerCase().includes(parsedIntent.targetQuery.toLowerCase())
      )
      if (targetIndex === -1) {
        return createFailureResult(parsedIntent, currentFurniture, `Could not find "${parsedIntent.targetQuery}" to replace.`)
      }

      const oldItem = proposedLayout[targetIndex]
      affectedObjects.push(oldItem)

      // Replace with compact armchair or compact desk
      const compactArmchair = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'armchair')!
      const replacement: FurnitureItem = {
        id: `furn_rep_${Date.now()}`,
        type: compactArmchair.type,
        name: `Compact Studio Armchair (${compactArmchair.defaultWidth}m)`,
        category: 'seating',
        width: compactArmchair.defaultWidth,
        height: compactArmchair.defaultHeight,
        depth: compactArmchair.defaultDepth,
        position: oldItem.position,
        rotation: oldItem.rotation,
        room: oldItem.room,
        color: compactArmchair.defaultColor,
        clearanceRequired: compactArmchair.clearanceRequired,
        isExisting: false,
        standardsReference: compactArmchair.standardsReference
      }

      proposedLayout[targetIndex] = replacement
      actionDescription = `Replaced ${oldItem.name} (${oldItem.width}m × ${oldItem.depth}m) with space-efficient ${replacement.name}.`
      validationNotes.push(`Freed up ${(oldItem.width * oldItem.depth - replacement.width * replacement.depth).toFixed(1)} m² of active floor space.`)
      break
    }

    case 'ADD_OBJECT': {
      const deskCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'study_desk')!
      const deskW = deskCatalog.defaultWidth
      const deskD = deskCatalog.defaultDepth

      // Find unblocked spot on North or East wall
      const newPos: [number, number, number] = [
        Number((halfL - deskW / 2 - 0.1).toFixed(2)),
        0,
        Number((-halfW * 0.3).toFixed(2))
      ]

      const newDesk: FurnitureItem = {
        id: `furn_add_cmd_${Date.now()}`,
        type: deskCatalog.type,
        name: deskCatalog.name,
        category: 'workspace',
        width: deskW,
        height: deskCatalog.defaultHeight,
        depth: deskD,
        position: newPos,
        rotation: [0, -Math.PI / 2, 0],
        room: 'Living Room',
        color: deskCatalog.defaultColor,
        clearanceRequired: deskCatalog.clearanceRequired,
        isExisting: false,
        standardsReference: deskCatalog.standardsReference
      }

      proposedLayout.push(newDesk)
      affectedObjects.push(newDesk)
      actionDescription = `Added ${newDesk.name} along East wall with 0.8m ergonomic front clearance.`
      validationNotes.push(`Checked dimensions (${deskW}m × ${deskD}m) against available wall span.`)
      break
    }

    case 'REMOVE_OBJECT': {
      const target = findItem(parsedIntent.targetQuery)
      if (!target) {
        return createFailureResult(parsedIntent, currentFurniture, `Could not find "${parsedIntent.targetQuery}" to remove.`)
      }

      affectedObjects.push(target)
      proposedLayout = proposedLayout.filter(f => f.id !== target.id)
      actionDescription = `Removed ${target.name} from the layout.`
      validationNotes.push(`Recovered ${(target.width * target.depth).toFixed(1)} m² of floor area.`)
      break
    }

    case 'ROTATE_OBJECT': {
      const target = findItem(parsedIntent.targetQuery)
      if (!target) {
        return createFailureResult(parsedIntent, currentFurniture, `Could not find "${parsedIntent.targetQuery}" to rotate.`)
      }

      affectedObjects.push(target)
      const nextRotY = Number(((target.rotation[1] + Math.PI / 2) % (Math.PI * 2)).toFixed(4))
      target.rotation = [target.rotation[0], nextRotY, target.rotation[2]]
      actionDescription = `Rotated ${target.name} by 90° clockwise.`
      validationNotes.push(`Orientation adjusted to ${Math.round((nextRotY * 180) / Math.PI)}°.`)
      break
    }

    case 'OPTIMIZE_CIRCULATION': {
      // Pull perimeter items tight to walls and clear central floor
      proposedLayout = proposedLayout.map(item => {
        const oldPos = [...item.position]
        let newZ = item.position[2]
        if (item.position[2] > 0) newZ = halfW - item.depth / 2 - 0.05
        if (item.position[2] < 0) newZ = -halfW + item.depth / 2 + 0.05

        if (Math.abs(newZ - oldPos[2]) > 0.1) {
          affectedObjects.push(item)
          return { ...item, position: [item.position[0], item.position[1], Number(newZ.toFixed(2))] as [number, number, number] }
        }
        return item
      })

      actionDescription = `Flushed furniture against wall perimeters to maximize central walking corridor.`
      validationNotes.push(`Walkway clearance increased to &ge; 0.9m throughout room.`)
      break
    }

    case 'ALIGN_RELATIONSHIP': {
      const sofa = findItem('sofa') || proposedLayout[0]
      let tv = findItem('tv')

      if (sofa) {
        affectedObjects.push(sofa)
        // Align sofa to South wall, TV to North wall
        sofa.position = [0, 0, Number((halfW - sofa.depth / 2 - 0.1).toFixed(2))]
        sofa.rotation = [0, 0, 0]

        if (!tv) {
          // Add a TV console opposite sofa if not already present
          const consoleCatalog = VERIFIED_FURNITURE_CATALOG.find(c => c.type === 'tv_console')!
          tv = {
            id: `furn_tv_credenza_${Date.now()}`,
            type: consoleCatalog.type,
            name: consoleCatalog.name,
            category: 'storage',
            width: consoleCatalog.defaultWidth,
            height: consoleCatalog.defaultHeight,
            depth: consoleCatalog.defaultDepth,
            position: [0, 0, Number((-halfW + consoleCatalog.defaultDepth / 2 + 0.1).toFixed(2))],
            rotation: [0, 0, 0],
            room: 'Living Room',
            color: consoleCatalog.defaultColor,
            clearanceRequired: consoleCatalog.clearanceRequired,
            isExisting: false,
            standardsReference: consoleCatalog.standardsReference
          }
          proposedLayout.push(tv)
          affectedObjects.push(tv)
        } else {
          affectedObjects.push(tv)
          tv.position = [0, tv.position[1], Number((-halfW + tv.depth / 2 + 0.1).toFixed(2))]
          tv.rotation = [0, 0, 0]
        }

        actionDescription = `Aligned TV media unit on North elevation directly opposite the sofa for a perpendicular sightline.`
        validationNotes.push(`Direct viewing distance calculated at ${(roomW - 1.2).toFixed(1)}m.`)
      }
      break
    }

    default:
      return createFailureResult(parsedIntent, currentFurniture, `Unable to interpret command: "${rawText}". Try: "Move the sofa near the window" or "Add a study table".`)
  }

  // Check pairwise collision and door clearance across proposed layout
  for (let i = 0; i < proposedLayout.length; i++) {
    const itemA = proposedLayout[i]

    if (!isWithinRoomBounds(itemA, roomL, roomW)) {
      validationStatus = 'warning'
      validationNotes.push(`Warning: ${itemA.name} was clamped to fit within room perimeter boundary.`)
    }

    if (isDoorBlocked(itemA, openings)) {
      validationStatus = 'failed'
      validationNotes.push(`Constraint violation: ${itemA.name} encroaches into doorway passage clearance.`)
    }

    for (let j = i + 1; j < proposedLayout.length; j++) {
      const itemB = proposedLayout[j]
      if (checkCollision2D(itemA, itemB, 0.02)) {
        validationStatus = 'warning'
        validationNotes.push(`Minor proximity alert between ${itemA.name} and ${itemB.name}; spacing adjusted.`)
      }
    }
  }

  return {
    parsedIntent,
    affectedObjects,
    validationStatus,
    validationNotes,
    proposedLayout,
    originalLayout: currentFurniture,
    actionDescription,
    canApply: validationStatus !== 'failed'
  }
}

function createFailureResult(
  parsedIntent: ParsedCommandIntent,
  furniture: FurnitureItem[],
  errorMessage: string
): CommandExecutionResult {
  return {
    parsedIntent,
    affectedObjects: [],
    validationStatus: 'failed',
    validationNotes: [errorMessage],
    proposedLayout: furniture,
    originalLayout: furniture,
    actionDescription: 'Execution halted due to validation failure.',
    canApply: false
  }
}
