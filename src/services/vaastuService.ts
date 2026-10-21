/**
 * Vaastu.ai Client Service
 * Bridges the UI with the server-authoritative credit system and spatial reasoning API.
 */

import { FurnitureItem } from '../types/furniture'
import { Opening3D } from './reconstructionEngine'
import { CulturalTradition } from './vaastuKnowledgeService'
import { VaastuChatResponse, VaastuProposedAction, processVaastuChatRequest } from './vaastu3DEngine'

export interface AICreditsState {
  creditsRemaining: number
  dailyAllowance: number
  nextResetTimestamp: number
  resetTimeFormatted: string
  isExhausted: boolean
}

export interface VaastuChatParams {
  userId?: string
  requestId?: string
  message: string
  currentFurniture: FurnitureItem[]
  roomDimensions: { length: number; width: number; height: number }
  openings?: Opening3D[]
  tradition?: CulturalTradition
  roomType?: string
  compassRotation?: number
  history?: Array<{ role: string; content: string; proposedAction?: VaastuProposedAction }>
}

export interface VaastuChatApiResult {
  success: boolean
  creditsRemaining: number
  dailyAllowance: number
  nextResetTimestamp: number
  resetTimeFormatted: string
  isExhausted: boolean
  response?: VaastuChatResponse
  error?: string
}

/**
 * Fetch authoritative user credit status from backend
 */
export async function fetchAICredits(userId: string = 'default_user'): Promise<AICreditsState> {
  try {
    const res = await fetch(`/api/vaastu/credits?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) {
      throw new Error(`Failed to fetch credits: ${res.statusText}`)
    }
    const data = await res.json()
    return {
      creditsRemaining: data.creditsRemaining ?? 10,
      dailyAllowance: data.dailyAllowance ?? 10,
      nextResetTimestamp: data.nextResetTimestamp ?? (Date.now() + 86400000),
      resetTimeFormatted: data.resetTimeFormatted ?? '12:00 AM IST',
      isExhausted: !!data.isExhausted
    }
  } catch (err) {
    console.warn('[VaastuService] Error checking credits, returning local fallback:', err)
    return {
      creditsRemaining: 10,
      dailyAllowance: 10,
      nextResetTimestamp: Date.now() + 86400000,
      resetTimeFormatted: '12:00 AM IST',
      isExhausted: false
    }
  }
}

/**
 * Send natural-language query to Vaastu.ai
 */
export async function sendVaastuChatMessage(params: VaastuChatParams): Promise<VaastuChatApiResult> {
  const requestId = params.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const userId = params.userId || 'default_user'

  try {
    const res = await fetch('/api/vaastu/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        userId,
        requestId
      })
    })

    if (res.status === 429) {
      const data = await res.json()
      return {
        success: false,
        creditsRemaining: data.creditsRemaining ?? 0,
        dailyAllowance: data.dailyAllowance ?? 10,
        nextResetTimestamp: data.nextResetTimestamp,
        resetTimeFormatted: data.resetTimeFormatted || '12:00 AM IST',
        isExhausted: true,
        error: data.error || 'AI credits exhausted for today. Credits reset at 12:00 AM IST.'
      }
    }

    if (res.ok) {
      const data = await res.json()
      if (data && data.success) {
        return {
          success: true,
          creditsRemaining: data.creditsRemaining,
          dailyAllowance: data.dailyAllowance,
          nextResetTimestamp: data.nextResetTimestamp,
          resetTimeFormatted: data.resetTimeFormatted,
          isExhausted: data.isExhausted,
          response: data.response
        }
      }
    }
  } catch (err) {
    console.warn('[VaastuService] Server API unavailable, using in-browser spatial engine:', err)
  }

  // Graceful in-browser spatial reasoning fallback (ideal for static deployments on Netlify/Vercel)
  const localResponse = processVaastuChatRequest(
    params.message,
    params.currentFurniture,
    params.roomDimensions,
    params.openings || [],
    params.tradition || 'vaastu_hindu',
    params.roomType || 'Living Room',
    params.compassRotation || 0,
    params.history || []
  )

  return {
    success: true,
    creditsRemaining: 9,
    dailyAllowance: 10,
    nextResetTimestamp: Date.now() + 86400000,
    resetTimeFormatted: '12:00 AM IST',
    isExhausted: false,
    response: localResponse
  }
}

/**
 * Development utility to reset credits
 */
export async function resetCreditsDev(userId: string = 'default_user'): Promise<AICreditsState> {
  const res = await fetch('/api/vaastu/reset-credits-dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  const data = await res.json()
  return {
    creditsRemaining: data.creditsRemaining,
    dailyAllowance: data.dailyAllowance,
    nextResetTimestamp: data.nextResetTimestamp,
    resetTimeFormatted: data.resetTimeFormatted,
    isExhausted: data.isExhausted
  }
}
