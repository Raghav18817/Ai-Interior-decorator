import { FurnitureItem } from '../types/furniture'
import { ProposedChangeItem, LayoutRevisionSnapshot } from '../types/approval'

/**
 * Computes a granular diff between original and proposed furniture layouts.
 */
export function computeLayoutDiff(
  original: FurnitureItem[],
  proposed: FurnitureItem[]
): ProposedChangeItem[] {
  const changes: ProposedChangeItem[] = []
  const originalMap = new Map(original.map(item => [item.id, item]))
  const proposedMap = new Map(proposed.map(item => [item.id, item]))

  // 1. Check for removed or replaced items
  for (const orig of original) {
    if (!proposedMap.has(orig.id)) {
      // Check if there is an item in proposed roughly in the same position that has different type (replacement)
      const replacement = proposed.find(p => 
        !originalMap.has(p.id) && 
        Math.hypot(p.position[0] - orig.position[0], p.position[2] - orig.position[2]) < 0.8
      )

      if (replacement) {
        changes.push({
          id: `diff_rep_${orig.id}_${replacement.id}`,
          furnitureId: replacement.id,
          name: `${orig.name} → ${replacement.name}`,
          category: replacement.category,
          actionType: 'replaced',
          beforeState: {
            position: orig.position,
            rotation: orig.rotation,
            width: orig.width,
            depth: orig.depth
          },
          afterState: {
            position: replacement.position,
            rotation: replacement.rotation,
            width: replacement.width,
            depth: replacement.depth
          },
          impactDescription: `Replaced ${orig.width}m × ${orig.depth}m with compact ${replacement.width}m × ${replacement.depth}m (${(orig.width * orig.depth - replacement.width * replacement.depth).toFixed(2)}m² saved)`,
          selected: true
        })
      } else {
        changes.push({
          id: `diff_rem_${orig.id}`,
          furnitureId: orig.id,
          name: orig.name,
          category: orig.category,
          actionType: 'removed',
          beforeState: {
            position: orig.position,
            rotation: orig.rotation,
            width: orig.width,
            depth: orig.depth
          },
          impactDescription: `Removed from layout (freed ${(orig.width * orig.depth).toFixed(2)}m² floor area)`,
          selected: true
        })
      }
    }
  }

  // 2. Check for added, moved, or rotated items
  for (const prop of proposed) {
    const orig = originalMap.get(prop.id)
    if (!orig) {
      // Check if this was already handled as a replacement
      const isReplacement = changes.some(c => c.actionType === 'replaced' && c.furnitureId === prop.id)
      if (!isReplacement) {
        changes.push({
          id: `diff_add_${prop.id}`,
          furnitureId: prop.id,
          name: prop.name,
          category: prop.category,
          actionType: 'added',
          afterState: {
            position: prop.position,
            rotation: prop.rotation,
            width: prop.width,
            depth: prop.depth
          },
          impactDescription: `New piece added at position [${prop.position[0]}m, ${prop.position[2]}m]`,
          selected: true
        })
      }
      continue
    }

    // Check position movement
    const posDist = Math.hypot(
      prop.position[0] - orig.position[0],
      prop.position[2] - orig.position[2]
    )

    // Check rotation change
    const rotDiff = Math.abs(prop.rotation[1] - orig.rotation[1])

    if (posDist > 0.05 && rotDiff > 0.05) {
      changes.push({
        id: `diff_move_rot_${prop.id}`,
        furnitureId: prop.id,
        name: prop.name,
        category: prop.category,
        actionType: 'moved',
        beforeState: {
          position: orig.position,
          rotation: orig.rotation,
          width: orig.width,
          depth: orig.depth
        },
        afterState: {
          position: prop.position,
          rotation: prop.rotation,
          width: prop.width,
          depth: prop.depth
        },
        impactDescription: `Moved ${posDist.toFixed(2)}m & rotated by ${Math.round((rotDiff * 180) / Math.PI)}°`,
        selected: true
      })
    } else if (posDist > 0.05) {
      changes.push({
        id: `diff_move_${prop.id}`,
        furnitureId: prop.id,
        name: prop.name,
        category: prop.category,
        actionType: 'moved',
        beforeState: {
          position: orig.position,
          rotation: orig.rotation,
          width: orig.width,
          depth: orig.depth
        },
        afterState: {
          position: prop.position,
          rotation: prop.rotation,
          width: prop.width,
          depth: prop.depth
        },
        impactDescription: `Repositioned ${posDist.toFixed(2)}m to [${prop.position[0]}m, ${prop.position[2]}m]`,
        selected: true
      })
    } else if (rotDiff > 0.05) {
      changes.push({
        id: `diff_rot_${prop.id}`,
        furnitureId: prop.id,
        name: prop.name,
        category: prop.category,
        actionType: 'rotated',
        beforeState: {
          position: orig.position,
          rotation: orig.rotation,
          width: orig.width,
          depth: orig.depth
        },
        afterState: {
          position: prop.position,
          rotation: prop.rotation,
          width: prop.width,
          depth: prop.depth
        },
        impactDescription: `Rotated by ${Math.round((rotDiff * 180) / Math.PI)}°`,
        selected: true
      })
    }
  }

  return changes
}

/**
 * Applies only the selectively accepted changes into the live furniture layout.
 */
export function applySelectedChanges(
  original: FurnitureItem[],
  proposed: FurnitureItem[],
  selectedChangeIds: string[],
  changes: ProposedChangeItem[]
): FurnitureItem[] {
  const selectedSet = new Set(selectedChangeIds)
  let result: FurnitureItem[] = original.map(item => ({ ...item }))

  for (const change of changes) {
    const isAccepted = selectedSet.has(change.id)

    if (change.actionType === 'added') {
      if (isAccepted) {
        const itemToAdd = proposed.find(p => p.id === change.furnitureId)
        if (itemToAdd && !result.some(r => r.id === itemToAdd.id)) {
          result.push({ ...itemToAdd })
        }
      }
    } else if (change.actionType === 'removed') {
      if (isAccepted) {
        result = result.filter(r => r.id !== change.furnitureId)
      }
    } else if (change.actionType === 'replaced') {
      if (isAccepted) {
        const replacementItem = proposed.find(p => p.id === change.furnitureId)
        if (replacementItem) {
          // Find original item that was replaced
          const origIdx = result.findIndex(r => 
            Math.hypot(r.position[0] - change.beforeState!.position[0], r.position[2] - change.beforeState!.position[2]) < 0.2
          )
          if (origIdx !== -1) {
            result[origIdx] = { ...replacementItem }
          } else {
            result.push({ ...replacementItem })
          }
        }
      }
    } else if (change.actionType === 'moved' || change.actionType === 'rotated') {
      if (isAccepted) {
        const propItem = proposed.find(p => p.id === change.furnitureId)
        if (propItem) {
          const idx = result.findIndex(r => r.id === propItem.id)
          if (idx !== -1) {
            result[idx] = { ...propItem }
          }
        }
      }
    }
  }

  return result
}

/**
 * Creates a timestamped revision snapshot for the undo/revert stack.
 */
export function createRevisionSnapshot(
  description: string,
  furniture: FurnitureItem[]
): LayoutRevisionSnapshot {
  return {
    revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    description,
    furniture: furniture.map(f => ({ ...f, position: [...f.position] as [number, number, number], rotation: [...f.rotation] as [number, number, number] }))
  }
}
