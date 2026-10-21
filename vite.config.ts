import 'dotenv/config'
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { dispatchOTP } from './server/otpDispatcher.ts'
import { processVaastuChatRequest } from './src/services/vaastu3DEngine.ts'

// Backend Persistent Database file
const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json')

interface DecomeDB {
  users: Array<{ id: string; name: string; email?: string; phoneNumber?: string; provider: string; createdAt: string }>
  activeOtps: Record<string, { code: string; expiresAt: number; type: 'phone' | 'email'; createdAt: number }>
  currentSession: { user: any; token: string; loggedInAt: string } | null
  projects: Array<any>
  aiCredits?: Record<string, {
    creditsRemaining: number
    lastResetDateIST: string
    history: Array<{ timestamp: number; action: string; deduction: number; requestId?: string }>
  }>
}

function normalizeTarget(target: string, type: 'phone' | 'email'): string {
  if (type === 'phone') {
    const digits = target.replace(/[^0-9]/g, '')
    return digits.length >= 10 ? digits.slice(-10) : digits
  }
  return target.trim().toLowerCase()
}

function initDB(): DecomeDB {
  try {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
      return {
        users: data.users || [],
        activeOtps: data.activeOtps || {},
        currentSession: data.currentSession || null,
        projects: data.projects || [],
        aiCredits: data.aiCredits || {}
      }
    }
  } catch (err) {
    console.error('Error reading database file, initializing fresh:', err)
  }

  const initial: DecomeDB = {
    users: [],
    activeOtps: {},
    currentSession: null,
    projects: [],
    aiCredits: {}
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
  } catch (err) {
    console.error('Error writing initial database file:', err)
  }
  return initial
}

function saveDB(db: DecomeDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('Failed to save to database:', err)
  }
}

// -------------------------------------------------------------
// Vaastu.ai Server-Authoritative Credit System
// Daily Allowance: 10 Credits | Reset: 12:00:00 AM IST (Asia/Kolkata)
// -------------------------------------------------------------
function getISTMidnightInfo(): { nextResetTimestamp: number; dateString: string; resetTimeFormatted: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const dateString = formatter.format(now) // Format: "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Next midnight IST (12:00 AM IST is 18:30 UTC of previous UTC calendar day)
  const nextResetTimestamp = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - (5.5 * 3600 * 1000)
  return {
    nextResetTimestamp,
    dateString,
    resetTimeFormatted: '12:00 AM IST'
  }
}

function getUserCreditRecord(db: DecomeDB, userId: string = 'default_user') {
  if (!db.aiCredits) {
    db.aiCredits = {}
  }
  const { dateString, nextResetTimestamp, resetTimeFormatted } = getISTMidnightInfo()
  let record = db.aiCredits[userId]

  // If new user or day rollover in IST, reset to 10
  if (!record || record.lastResetDateIST !== dateString) {
    record = {
      creditsRemaining: 10,
      lastResetDateIST: dateString,
      history: record?.history || []
    }
    db.aiCredits[userId] = record
    saveDB(db)
  }

  return {
    record,
    creditsRemaining: record.creditsRemaining,
    dailyAllowance: 10,
    nextResetTimestamp,
    resetTimeFormatted,
    isExhausted: record.creditsRemaining <= 0
  }
}

function deductUserCredit(db: DecomeDB, userId: string = 'default_user', action: string = 'chat', requestId?: string) {
  const status = getUserCreditRecord(db, userId)
  if (status.creditsRemaining <= 0) {
    return {
      success: false,
      creditsRemaining: 0,
      nextResetTimestamp: status.nextResetTimestamp,
      resetTimeFormatted: status.resetTimeFormatted,
      isExhausted: true
    }
  }

  // Idempotency: avoid double-charging if same requestId was already deducted
  if (requestId && status.record.history.some(h => h.requestId === requestId && h.deduction > 0)) {
    return {
      success: true,
      creditsRemaining: status.record.creditsRemaining,
      nextResetTimestamp: status.nextResetTimestamp,
      resetTimeFormatted: status.resetTimeFormatted,
      isExhausted: status.record.creditsRemaining <= 0
    }
  }

  status.record.creditsRemaining = Math.max(0, status.record.creditsRemaining - 1)
  status.record.history.push({
    timestamp: Date.now(),
    action,
    deduction: 1,
    requestId
  })
  saveDB(db)

  return {
    success: true,
    creditsRemaining: status.record.creditsRemaining,
    nextResetTimestamp: status.nextResetTimestamp,
    resetTimeFormatted: status.resetTimeFormatted,
    isExhausted: status.record.creditsRemaining <= 0
  }
}

function refundUserCredit(db: DecomeDB, userId: string = 'default_user', requestId?: string) {
  if (!db.aiCredits || !db.aiCredits[userId]) return
  const record = db.aiCredits[userId]
  // Only refund if this requestId actually had a positive deduction
  const foundIndex = record.history.findIndex(h => h.requestId === requestId && h.deduction > 0)
  if (foundIndex !== -1) {
    record.creditsRemaining = Math.min(10, record.creditsRemaining + 1)
    record.history.push({
      timestamp: Date.now(),
      action: 'refund',
      deduction: -1,
      requestId
    })
    saveDB(db)
  }
}

// Backend REST API Server Plugin for Multi-Device Data Sync
function backendDatabaseApiPlugin(): Plugin {
  return {
    name: 'decome-backend-database-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next()
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const pathname = url.pathname

        // Helper to read JSON request body
        const getBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {})
              } catch {
                resolve({})
              }
            })
          })
        }

        const sendJSON = (statusCode: number, data: any) => {
          res.statusCode = statusCode
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.end(JSON.stringify(data))
        }

        if (req.method === 'OPTIONS') {
          return sendJSON(200, { ok: true })
        }

        const db = initDB()

        // 1. Health & Server Status
        if (pathname === '/api/health' && req.method === 'GET') {
          return sendJSON(200, {
            status: 'online',
            storage: 'persistent_database_json',
            totalProjects: db.projects.length,
            totalUsers: db.users.length,
            activeOtpsCount: Object.keys(db.activeOtps).length,
            hasActiveSession: !!db.currentSession,
            timestamp: new Date().toISOString()
          })
        }

        // 2. Multi-Device Central Database Session
        if (pathname === '/api/auth/session' && req.method === 'GET') {
          return sendJSON(200, {
            success: true,
            user: db.currentSession?.user || null,
            session: db.currentSession
          })
        }

        if (pathname === '/api/auth/logout' && req.method === 'POST') {
          db.currentSession = null
          saveDB(db)
          return sendJSON(200, { success: true, message: 'Logged out successfully across devices.' })
        }

        // 3. Dispatch & Store OTP in Database
        if (pathname === '/api/auth/send-otp' && req.method === 'POST') {
          getBody().then(body => {
            const { target, type } = body
            if (!target || !type) {
              return sendJSON(400, { success: false, error: 'Target phone/email and type are required.' })
            }

            const normTarget = normalizeTarget(target, type)
            const code = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes validity

            db.activeOtps[normTarget] = { 
              code, 
              expiresAt, 
              type, 
              createdAt: Date.now() 
            }
            saveDB(db)

            console.log(`[DECOME DATABASE] 💾 Stored OTP ${code} for [${normTarget}] in server database`)

            dispatchOTP({ target, type, code }).then(dispatchRes => {
              return sendJSON(200, {
                success: true,
                message: dispatchRes.message || `Verification code successfully dispatched to ${target}.`,
                previewUrl: dispatchRes.previewUrl,
                whatsappLink: dispatchRes.whatsappLink,
                otpHint: code // Provided so user is never locked out on any device
              })
            }).catch(err => {
              console.error('Error dispatching OTP:', err)
              return sendJSON(200, {
                success: true,
                message: `Verification code stored in database for ${target}.`,
                otpHint: code
              })
            })
          })
          return
        }

        // 4. Verify OTP from Central Database
        if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
          getBody().then(body => {
            const { target, code, type } = body
            if (!target || !code) {
              return sendJSON(400, { success: false, error: 'Target and 6-digit OTP code are required.' })
            }

            const normTarget = normalizeTarget(target, type)
            const record = db.activeOtps[normTarget]

            if (!record) {
              return sendJSON(400, { 
                success: false, 
                error: `No active OTP found for ${target} in database. Please click "Send OTP" first.` 
              })
            }

            if (Date.now() > record.expiresAt) {
              delete db.activeOtps[normTarget]
              saveDB(db)
              return sendJSON(400, { success: false, error: 'This OTP has expired. Please request a new code.' })
            }

            if (record.code !== code.trim()) {
              return sendJSON(400, { success: false, error: 'Incorrect verification code. Please check and try again.' })
            }

            // OTP verified! Clean up OTP record
            delete db.activeOtps[normTarget]

            const displayName = type === 'email'
              ? target.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
              : `Member ${normTarget.slice(-4)}`

            let user = db.users.find(u => 
              (type === 'email' && u.email?.toLowerCase() === normTarget) || 
              (type === 'phone' && u.phoneNumber?.endsWith(normTarget))
            )

            if (!user) {
              user = {
                id: `usr_${Date.now()}`,
                name: displayName || 'DECOME Member',
                email: type === 'email' ? target.trim() : undefined,
                phoneNumber: type === 'phone' ? target.trim() : undefined,
                provider: type,
                createdAt: new Date().toISOString()
              }
              db.users.push(user)
            }

            // Set global active session in database so all devices are synced
            db.currentSession = {
              user,
              token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              loggedInAt: new Date().toISOString()
            }

            saveDB(db)
            console.log(`[DECOME DATABASE] 🔐 User ${user.name} logged in. Session saved to database.`)
            return sendJSON(200, { success: true, user, session: db.currentSession })
          })
          return
        }

        // 5. Query Active OTP from Database (Instant fetch for multi-device login)
        if (pathname === '/api/auth/latest-otp' && req.method === 'GET') {
          const target = url.searchParams.get('target') || ''
          const type = (url.searchParams.get('type') || 'phone') as 'phone' | 'email'
          const normTarget = normalizeTarget(target, type)
          const record = db.activeOtps[normTarget]

          if (record && Date.now() <= record.expiresAt) {
            return sendJSON(200, {
              success: true,
              code: record.code,
              expiresAt: record.expiresAt,
              target: normTarget
            })
          }
          return sendJSON(404, { success: false, error: 'No active OTP found in database for this destination.' })
        }

        // 6. Projects CRUD in Database
        if (pathname === '/api/projects' && req.method === 'GET') {
          return sendJSON(200, { success: true, projects: db.projects })
        }

        if (pathname === '/api/projects' && req.method === 'POST') {
          getBody().then(body => {
            const project = body.project
            if (!project || !project.id) {
              return sendJSON(400, { success: false, error: 'Valid project object required.' })
            }

            const idx = db.projects.findIndex(p => p.id === project.id)
            if (idx >= 0) {
              db.projects[idx] = project
            } else {
              db.projects.unshift(project)
            }
            saveDB(db)
            return sendJSON(200, { success: true, project })
          })
          return
        }

        if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
          const id = pathname.replace('/api/projects/', '')
          db.projects = db.projects.filter(p => p.id !== id)
          saveDB(db)
          return sendJSON(200, { success: true, deletedId: id })
        }

        // 7. World Labs Marble AI Endpoints
        const WORLD_LABS_KEY = process.env.WORLD_LABS_API_KEY || 's1F1od6Ff6P6C3tVPe2nkIm95Ey9lXXp'

        // Status check endpoint
        if (pathname === '/api/worldlabs/status' && req.method === 'GET') {
          return sendJSON(200, {
            success: true,
            configured: !!(WORLD_LABS_KEY && WORLD_LABS_KEY.trim().length > 5),
            keyPrefix: WORLD_LABS_KEY ? `${WORLD_LABS_KEY.slice(0, 4)}...${WORLD_LABS_KEY.slice(-3)}` : null,
            model: 'marble-1.1',
            provider: 'World Labs Marble AI'
          })
        }

        // World Labs Generation Trigger Endpoint (Supports single or multi-angle photos)
        if (pathname === '/api/worldlabs/generate' && req.method === 'POST') {
          getBody().then(async (body) => {
            const { imageBase64, imageName, textPrompt, images, displayName } = body
            
            // Normalize list of images to upload
            const imageList: Array<{ dataUrl: string; name: string }> = []
            if (Array.isArray(images) && images.length > 0) {
              images.forEach((img: any, idx: number) => {
                if (img.dataUrl && typeof img.dataUrl === 'string') {
                  imageList.push({
                    dataUrl: img.dataUrl,
                    name: img.name || `room_photo_${idx + 1}.png`
                  })
                }
              })
            } else if (imageBase64 && typeof imageBase64 === 'string') {
              imageList.push({
                dataUrl: imageBase64,
                name: imageName || `room_photo_${Date.now()}.png`
              })
            }

            if (imageList.length === 0) {
              return sendJSON(400, { success: false, error: 'At least one valid image is required for 3D reconstruction.' })
            }

            if (!WORLD_LABS_KEY || WORLD_LABS_KEY.trim().length < 5) {
              return sendJSON(500, { 
                success: false, 
                error: 'WORLD_LABS_API_KEY is not configured in environment. Please add it to your .env file.' 
              })
            }

            try {
              // Upload up to 6 photos to World Labs Cloud Storage staging
              const mediaAssetIds: string[] = []
              const uploadLimit = Math.min(imageList.length, 6)

              for (let i = 0; i < uploadLimit; i++) {
                const targetImg = imageList[i]
                
                // 1. Prepare upload session with World Labs
                const prepRes = await fetch('https://api.worldlabs.ai/marble/v1/media-assets:prepare_upload', {
                  method: 'POST',
                  headers: {
                    'WLT-Api-Key': WORLD_LABS_KEY,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    file_name: targetImg.name,
                    kind: 'image'
                  })
                })

                if (!prepRes.ok) {
                  const errText = await prepRes.text()
                  return sendJSON(prepRes.status, { 
                    success: false, 
                    error: `World Labs prepare_upload error on image ${i + 1}: ${errText}` 
                  })
                }

                const prepData = (await prepRes.json()) as any
                const media_asset_id = prepData.media_asset?.media_asset_id || prepData.media_asset_id
                const upload_url = prepData.upload_info?.upload_url || prepData.upload_url

                if (!media_asset_id || !upload_url) {
                  return sendJSON(502, { 
                    success: false, 
                    error: `Failed to obtain valid media asset credentials from World Labs for image ${i + 1}.` 
                  })
                }

                // 2. Decode base64 binary and upload directly to Google Cloud Storage
                const cleanBase64 = targetImg.dataUrl.replace(/^data:image\/\w+;base64,/, '')
                const buffer = Buffer.from(cleanBase64, 'base64')

                // Determine mime type
                let mimeType = 'image/png'
                if (targetImg.dataUrl.startsWith('data:image/jpeg') || targetImg.dataUrl.startsWith('data:image/jpg')) {
                  mimeType = 'image/jpeg'
                } else if (targetImg.dataUrl.startsWith('data:image/webp')) {
                  mimeType = 'image/webp'
                }

                const gcsRes = await fetch(upload_url, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': mimeType,
                    'x-goog-content-length-range': '0,104857600'
                  },
                  body: buffer
                })

                if (!gcsRes.ok) {
                  const gcsErr = await gcsRes.text()
                  return sendJSON(502, { 
                    success: false, 
                    error: `Google Cloud Storage media upload failed for image ${i + 1}: ${gcsErr}` 
                  })
                }

                mediaAssetIds.push(media_asset_id)
              }

              // 3. Initiate World Generation
              const isMultiImage = mediaAssetIds.length > 1
              const promptPayload = isMultiImage
                ? {
                    type: 'multi-image',
                    multi_image_prompt: mediaAssetIds.map(id => ({
                      content: {
                        source: 'media_asset',
                        media_asset_id: id
                      }
                    })),
                    text_prompt: textPrompt || 'A photorealistic architectural room reconstruction with accurate wall boundaries and interior furnishings'
                  }
                : {
                    type: 'image',
                    image_prompt: {
                      source: 'media_asset',
                      media_asset_id: mediaAssetIds[0]
                    },
                    text_prompt: textPrompt || 'A photorealistic architectural room reconstruction with accurate wall boundaries and interior furnishings'
                  }

              const genRes = await fetch('https://api.worldlabs.ai/marble/v1/worlds:generate', {
                method: 'POST',
                headers: {
                  'WLT-Api-Key': WORLD_LABS_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  display_name: displayName || `InteriorAI Room (${new Date().toLocaleTimeString()})`,
                  model: 'marble-1.1',
                  world_prompt: promptPayload
                })
              })

              if (!genRes.ok) {
                const genErr = await genRes.text()
                return sendJSON(genRes.status, { 
                  success: false, 
                  error: `World Labs worlds:generate error: ${genErr}` 
                })
              }

              const genData = (await genRes.json()) as any
              const operationId = genData.operation_id || genData.id
              const worldId = genData.metadata?.world_id || null

              return sendJSON(200, {
                success: true,
                operationId,
                worldId,
                imagesProcessed: mediaAssetIds.length,
                viewerUrl: worldId ? `https://marble.worldlabs.ai/world/${worldId}` : null
              })
            } catch (err: any) {
              console.error('[WORLD LABS SERVER] Error generating world:', err)
              return sendJSON(500, { success: false, error: err.message || 'Internal server error' })
            }
          })
          return
        }

        // Operation Polling Endpoint
        if (pathname.startsWith('/api/worldlabs/operation/') && req.method === 'GET') {
          const operationId = pathname.replace('/api/worldlabs/operation/', '')
          fetch(`https://api.worldlabs.ai/marble/v1/operations/${encodeURIComponent(operationId)}`, {
            headers: {
              'WLT-Api-Key': WORLD_LABS_KEY
            }
          })
            .then(async (opRes) => {
              if (!opRes.ok) {
                const errText = await opRes.text()
                return sendJSON(opRes.status, { success: false, error: errText })
              }
              const opData = (await opRes.json()) as any
              let worldId = opData.metadata?.world_id || opData.response?.world?.id || opData.response?.world_id || null
              let viewerUrl = worldId ? `https://marble.worldlabs.ai/world/${worldId}` : null
              let meshUrl = opData.response?.assets?.mesh?.collider_mesh_url || null
              let thumbnailUrl = opData.response?.assets?.thumbnail_url || opData.response?.world?.assets?.thumbnail_url || null
              let caption = opData.response?.assets?.caption || null
              let semantics = opData.response?.assets?.splats?.semantics_metadata || null

              // If completed and world details aren't embedded, fetch the world resource
              if (opData.done && worldId && (!meshUrl || !thumbnailUrl)) {
                try {
                  const worldRes = await fetch(`https://api.worldlabs.ai/marble/v1/worlds/${encodeURIComponent(worldId)}`, {
                    headers: { 'WLT-Api-Key': WORLD_LABS_KEY }
                  })
                  if (worldRes.ok) {
                    const worldData = (await worldRes.json()) as any
                    viewerUrl = worldData.world_marble_url || viewerUrl
                    meshUrl = worldData.assets?.mesh?.collider_mesh_url || meshUrl
                    thumbnailUrl = worldData.assets?.thumbnail_url || thumbnailUrl
                    caption = worldData.assets?.caption || caption
                    semantics = worldData.assets?.splats?.semantics_metadata || semantics
                  }
                } catch (worldFetchErr) {
                  console.warn('Could not fetch supplemental world metadata:', worldFetchErr)
                }
              }

              return sendJSON(200, {
                success: true,
                done: !!opData.done,
                operationId,
                worldId,
                viewerUrl,
                meshUrl,
                thumbnailUrl,
                caption,
                semantics,
                status: opData.metadata?.progress?.status || (opData.done ? 'COMPLETED' : 'IN_PROGRESS'),
                description: opData.metadata?.progress?.description || (opData.done ? '3D world reconstructed successfully' : 'World generation in progress'),
                raw: opData
              })
            })
            .catch((err) => {
              console.error('[WORLD LABS SERVER] Error polling operation:', err)
              return sendJSON(500, { success: false, error: err.message })
            })
          return
        }

        // Direct World Details Endpoint
        if (pathname.startsWith('/api/worldlabs/world/') && req.method === 'GET') {
          const worldId = pathname.replace('/api/worldlabs/world/', '')
          fetch(`https://api.worldlabs.ai/marble/v1/worlds/${encodeURIComponent(worldId)}`, {
            headers: {
              'WLT-Api-Key': WORLD_LABS_KEY
            }
          })
            .then(async (worldRes) => {
              if (!worldRes.ok) {
                const errText = await worldRes.text()
                return sendJSON(worldRes.status, { success: false, error: errText })
              }
              const worldData = (await worldRes.json()) as any
              return sendJSON(200, {
                success: true,
                worldId,
                viewerUrl: worldData.world_marble_url || `https://marble.worldlabs.ai/world/${worldId}`,
                meshUrl: worldData.assets?.mesh?.collider_mesh_url || null,
                thumbnailUrl: worldData.assets?.thumbnail_url || null,
                caption: worldData.assets?.caption || null,
                semantics: worldData.assets?.splats?.semantics_metadata || null,
                raw: worldData
              })
            })
            .catch((err) => {
              console.error('[WORLD LABS SERVER] Error fetching world:', err)
              return sendJSON(500, { success: false, error: err.message })
            })
          return
        }

        // Vaastu.ai Credits Status Endpoint
        if (pathname === '/api/vaastu/credits' && req.method === 'GET') {
          const userId = (url.searchParams.get('userId') || 'default_user').trim()
          const db = initDB()
          const info = getUserCreditRecord(db, userId)
          return sendJSON(200, {
            success: true,
            creditsRemaining: info.creditsRemaining,
            dailyAllowance: info.dailyAllowance,
            nextResetTimestamp: info.nextResetTimestamp,
            resetTimeFormatted: info.resetTimeFormatted,
            isExhausted: info.isExhausted
          })
        }

        // Vaastu.ai Reset Credits (Dev/Testing utility)
        if (pathname === '/api/vaastu/reset-credits-dev' && req.method === 'POST') {
          getBody().then((body) => {
            const userId = (body.userId || 'default_user').trim()
            const db = initDB()
            if (!db.aiCredits) db.aiCredits = {}
            const { dateString, nextResetTimestamp, resetTimeFormatted } = getISTMidnightInfo()
            db.aiCredits[userId] = {
              creditsRemaining: 10,
              lastResetDateIST: dateString,
              history: []
            }
            saveDB(db)
            return sendJSON(200, {
              success: true,
              creditsRemaining: 10,
              dailyAllowance: 10,
              nextResetTimestamp,
              resetTimeFormatted,
              isExhausted: false
            })
          })
          return
        }

        // Vaastu.ai Natural Language Chat & Spatial Modification Endpoint
        if (pathname === '/api/vaastu/chat' && req.method === 'POST') {
          getBody().then(async (body) => {
            const userId = (body.userId || 'default_user').trim()
            const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            const db = initDB()

            // 1. Enforce Server-Authoritative Credit Deduction
            const deduction = deductUserCredit(db, userId, 'vaastu_chat', requestId)
            if (!deduction.success) {
              return sendJSON(429, {
                success: false,
                error: 'AI credits exhausted for today. Credits reset at 12:00 AM IST.',
                creditsRemaining: deduction.creditsRemaining,
                dailyAllowance: 10,
                nextResetTimestamp: deduction.nextResetTimestamp,
                resetTimeFormatted: deduction.resetTimeFormatted,
                isExhausted: true
              })
            }

            // 2. Execute Spatial Reasoning Engine
            try {
              const {
                message = '',
                currentFurniture = [],
                roomDimensions = { length: 4.5, width: 3.5, height: 2.8 },
                openings = [],
                tradition = 'vaastu_hindu',
                roomType = 'Living Room',
                compassRotation = 0,
                history = []
              } = body

              const chatResponse = processVaastuChatRequest(
                message,
                currentFurniture,
                roomDimensions,
                openings,
                tradition,
                roomType,
                compassRotation,
                history
              )

              // 3. Optional Google Gemini API Integration:
              // If GEMINI_API_KEY is configured in .env or supplied in request, call Gemini to enrich the natural-language advice
              const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || body.geminiApiKey || '').trim()
              if (geminiApiKey) {
                try {
                  const prompt = `You are Vaastu AI, an expert conversational interior design and spatial harmony assistant.
Tagline: "Thoughtful Spaces. Meaningful Living."
Room: ${roomType} (${roomDimensions.length}m x ${roomDimensions.width}m x ${roomDimensions.height}m).
Selected Tradition: ${tradition}.
Existing Furniture: ${currentFurniture.map((f: any) => f.name).join(', ') || 'Empty'}.
User Message: "${message}"

Engine Proposed 3D Action: ${chatResponse.proposedAction ? `${chatResponse.proposedAction.operation} on ${chatResponse.proposedAction.objectName}: ${chatResponse.proposedAction.reason}` : 'General consultation'}.

Provide an articulate, helpful, conversational response (under 120 words). If applicable, explain the spatial alignment according to the tradition. Clarify that traditional principles are cultural guidelines rather than empirical guarantees.`

                  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }]
                    })
                  })

                  if (geminiRes.ok) {
                    const geminiData = await geminiRes.json()
                    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
                    if (aiText && aiText.trim().length > 0) {
                      chatResponse.replyText = aiText.trim()
                    }
                  }
                } catch (geminiErr) {
                  console.warn('[VAASTU API] Gemini call error, falling back to local engine:', geminiErr)
                }
              }

              return sendJSON(200, {
                success: true,
                creditsRemaining: deduction.creditsRemaining,
                dailyAllowance: 10,
                nextResetTimestamp: deduction.nextResetTimestamp,
                resetTimeFormatted: deduction.resetTimeFormatted,
                isExhausted: deduction.creditsRemaining <= 0,
                response: chatResponse
              })
            } catch (engineErr: any) {
              console.error('[VAASTU API] Error processing spatial command:', engineErr)
              // Strict Refund Policy: restore credit if execution failed
              refundUserCredit(db, userId, requestId)
              const updatedStatus = getUserCreditRecord(db, userId)
              return sendJSON(500, {
                success: false,
                error: engineErr?.message || 'Spatial reasoning error occurred. Credit has been refunded.',
                creditsRemaining: updatedStatus.creditsRemaining,
                nextResetTimestamp: updatedStatus.nextResetTimestamp,
                resetTimeFormatted: updatedStatus.resetTimeFormatted
              })
            }
          })
          return
        }

        // Fallback
        return sendJSON(404, { error: 'API endpoint not found' })
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), backendDatabaseApiPlugin()],
  server: {
    host: true, // Listen on all network interfaces (works on mobile, tablets & laptops)
    port: 3000,
    open: false
  }
})
