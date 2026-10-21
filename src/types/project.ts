import { RoomAnalysisResult } from './analysis'
import { FurnitureItem } from './furniture'
import { LayoutRevisionSnapshot } from './approval'

export type ProjectScope = 'complete_house' | 'individual_room'

export type RoomType = 
  | 'Living Room' 
  | 'Bedroom' 
  | 'Kitchen' 
  | 'Bathroom' 
  | 'Office' 
  | 'Other'

export const ROOM_TYPES: RoomType[] = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Other'
]

export interface UploadedImage {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  uploadedAt: string
  status: 'uploading' | 'ready' | 'error'
  progress: number
  error?: string
}

export interface Project {
  id: string
  name: string
  scope: ProjectScope
  roomType?: RoomType
  images?: UploadedImage[]
  analysisResult?: RoomAnalysisResult
  furniture?: FurnitureItem[]
  revisionHistory?: LayoutRevisionSnapshot[]
  worldLabsWorldId?: string
  worldLabsViewerUrl?: string
  worldLabsStatus?: 'idle' | 'preparing' | 'generating' | 'ready' | 'error'
  worldLabsOpId?: string
  worldLabsError?: string
  worldLabsAssets?: {
    colliderMeshUrl?: string
    thumbnailUrl?: string
    caption?: string
    metricScaleFactor?: number
  }
  dimensionConfirmation?: {
    confirmedByUser: boolean
    calibratedWidth?: number
    calibratedLength?: number
    calibratedHeight?: number
    notes?: string
  }
  schemaVersion?: number
  createdAt: string
  updatedAt: string
}
