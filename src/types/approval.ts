import { FurnitureItem, FurnitureCategory } from './furniture'

export type ProposalActionType = 'added' | 'moved' | 'replaced' | 'removed' | 'rotated'

export interface ProposedChangeItem {
  id: string
  furnitureId: string
  name: string
  category: FurnitureCategory
  actionType: ProposalActionType
  beforeState?: {
    position: [number, number, number]
    rotation: [number, number, number]
    width: number
    depth: number
  }
  afterState?: {
    position: [number, number, number]
    rotation: [number, number, number]
    width: number
    depth: number
  }
  impactDescription: string
  selected: boolean
}

export interface LayoutRevisionSnapshot {
  revisionId: string
  timestamp: string
  description: string
  furniture: FurnitureItem[]
}
