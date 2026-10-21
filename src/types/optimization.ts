import { FurnitureItem } from './furniture'

export type OptimizationGoal = 
  | 'maximize_space'
  | 'add_workspace'
  | 'entertainment_focus'
  | 'cozy_conversational'
  | 'replace_bulky'

export interface LayoutChange {
  id: string
  action: 'moved' | 'rotated' | 'added' | 'removed' | 'replaced'
  targetItemName: string
  description: string
  previousState?: {
    position?: [number, number, number]
    rotation?: [number, number, number]
    dimensions?: string
  }
  newState?: {
    position?: [number, number, number]
    rotation?: [number, number, number]
    dimensions?: string
  }
}

export interface OptimizedLayoutProposal {
  id: string
  goal: OptimizationGoal
  title: string
  summary: string
  originalFurniture: FurnitureItem[]
  proposedFurniture: FurnitureItem[]
  changes: LayoutChange[]
  metrics: {
    originalOccupancyPercent: number
    proposedOccupancyPercent: number
    circulationGainM2: number
    walkingClearanceM: number
  }
  createdAt: string
}
