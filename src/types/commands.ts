import { FurnitureItem } from './furniture'

export type CommandIntentType = 
  | 'MOVE_OBJECT'
  | 'REPLACE_OBJECT'
  | 'ADD_OBJECT'
  | 'REMOVE_OBJECT'
  | 'ROTATE_OBJECT'
  | 'OPTIMIZE_CIRCULATION'
  | 'ALIGN_RELATIONSHIP'
  | 'UNKNOWN'

export interface ParsedCommandIntent {
  rawText: string
  intentType: CommandIntentType
  targetQuery: string
  referenceQuery?: string
  parameter?: string
  confidence: number
}

export interface CommandExecutionResult {
  parsedIntent: ParsedCommandIntent
  affectedObjects: FurnitureItem[]
  validationStatus: 'passed' | 'warning' | 'failed'
  validationNotes: string[]
  proposedLayout: FurnitureItem[]
  originalLayout: FurnitureItem[]
  actionDescription: string
  canApply: boolean
}
