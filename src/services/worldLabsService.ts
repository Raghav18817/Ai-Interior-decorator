import { UploadedImage } from '../types/project'

export interface WorldLabsOperationStatus {
  done: boolean
  operationId: string
  worldId?: string
  viewerUrl?: string
  meshUrl?: string
  thumbnailUrl?: string
  caption?: string
  semantics?: {
    metric_scale_factor?: number
    ground_plane_offset?: number
    [key: string]: any
  }
  status?: string
  description?: string
  error?: string
  raw?: any
}

export interface WorldLabsConfigStatus {
  success: boolean
  configured: boolean
  keyPrefix?: string | null
  model?: string
  provider?: string
}

export interface WorldLabsGenerationOptions {
  textPrompt?: string
  displayName?: string
  roomType?: string
}

/**
 * Checks if the backend has World Labs credentials configured and ready.
 */
export async function checkWorldLabsStatus(): Promise<WorldLabsConfigStatus> {
  try {
    const res = await fetch('/api/worldlabs/status')
    if (!res.ok) {
      return { success: false, configured: false }
    }
    return await res.json()
  } catch (err) {
    console.warn('Could not query World Labs status endpoint:', err)
    return { success: false, configured: false }
  }
}

/**
 * Triggers World Labs Marble AI 3D world reconstruction from uploaded room photo(s).
 * Supports single image or multi-angle photos.
 */
export async function triggerWorldLabsGeneration(
  imageOrImages: UploadedImage | UploadedImage[],
  options?: string | WorldLabsGenerationOptions
): Promise<{ operationId: string; worldId?: string; viewerUrl?: string; imagesProcessed?: number }> {
  try {
    const imagesArray = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages]
    const validImages = imagesArray.filter(img => img.status === 'ready' && img.dataUrl)

    if (validImages.length === 0) {
      throw new Error('No ready photographs available with valid image data.')
    }

    // Resolve options
    let textPrompt = 'A photorealistic architectural room reconstruction with accurate boundaries and interior furnishings'
    let displayName = 'InteriorAI Room Reconstruction'

    if (typeof options === 'string') {
      textPrompt = options
    } else if (options) {
      if (options.textPrompt) textPrompt = options.textPrompt
      if (options.displayName) displayName = options.displayName
      if (options.roomType) {
        textPrompt = `A photorealistic architectural ${options.roomType} interior reconstruction with natural lighting, accurate wall boundaries, and furnishings`
      }
    }

    const payload = {
      images: validImages.map(img => ({
        dataUrl: img.dataUrl,
        name: img.name
      })),
      imageBase64: validImages[0].dataUrl,
      imageName: validImages[0].name,
      displayName,
      textPrompt
    }

    const res = await fetch('/api/worldlabs/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to start World Labs 3D reconstruction')
    }

    return {
      operationId: data.operationId,
      worldId: data.worldId,
      viewerUrl: data.viewerUrl,
      imagesProcessed: data.imagesProcessed
    }
  } catch (err: any) {
    console.error('World Labs generation error:', err)
    throw new Error(err.message || 'World Labs API request failed')
  }
}

/**
 * Polls World Labs operation status until the 3D model is reconstructed.
 */
export async function pollWorldLabsOperation(
  operationId: string
): Promise<WorldLabsOperationStatus> {
  try {
    const res = await fetch(`/api/worldlabs/operation/${encodeURIComponent(operationId)}`)
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to query operation status')
    }
    return data
  } catch (err: any) {
    console.error('World Labs poll error:', err)
    throw new Error(err.message || 'Failed to query operation status')
  }
}

/**
 * Fetches assets and interactive links for an existing reconstructed World ID.
 */
export async function fetchWorldLabsWorld(
  worldId: string
): Promise<WorldLabsOperationStatus> {
  try {
    const res = await fetch(`/api/worldlabs/world/${encodeURIComponent(worldId)}`)
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve reconstructed world data')
    }
    return {
      done: true,
      operationId: '',
      worldId: data.worldId,
      viewerUrl: data.viewerUrl,
      meshUrl: data.meshUrl,
      thumbnailUrl: data.thumbnailUrl,
      caption: data.caption,
      semantics: data.semantics,
      raw: data.raw
    }
  } catch (err: any) {
    console.error('World Labs fetch error:', err)
    throw new Error(err.message || 'Failed to retrieve reconstructed 3D world')
  }
}
