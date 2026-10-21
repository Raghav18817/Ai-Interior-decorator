export type ValidationSeverity = 'error' | 'warning' | 'info'

export type ValidationCheckType = 
  | 'collision'
  | 'boundary'
  | 'door_passage'
  | 'window_glazing'
  | 'ergonomics'
  | 'circulation'
  | 'request_intent'

export interface ValidationIssue {
  id: string
  checkType: ValidationCheckType
  severity: ValidationSeverity
  title: string
  description: string
  affectedItemIds: string[]
  affectedItemNames: string[]
  suggestedFix?: string
  autoFixAvailable?: boolean
}

export interface CheckCategorySummary {
  checkType: ValidationCheckType
  name: string
  status: 'passed' | 'warning' | 'failed'
  message: string
}

export interface RoomValidationReport {
  overallStatus: 'passed' | 'warning' | 'failed'
  score: number // 0 to 100
  totalChecks: number
  passedChecks: number
  issues: ValidationIssue[]
  categories: CheckCategorySummary[]
  timestamp: string
}
