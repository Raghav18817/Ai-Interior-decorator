import test from 'node:test'
import assert from 'node:assert/strict'

// 1. Validation logic testing
function validatePhotoUpload(file) {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxBytes = 20 * 1024 * 1024 // 20 MB

  if (!file || !file.name) {
    return { valid: false, error: 'File is required.' }
  }

  if (!supportedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Please upload JPEG, PNG, or WEBP.` 
    }
  }

  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `File ${file.name} exceeds the 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` 
    }
  }

  return { valid: true }
}

// 2. Multi-photo staging logic testing
function prepareReconstructionPayload(images, options = {}) {
  const readyImages = (images || []).filter(img => img.status === 'ready' && img.dataUrl)

  if (readyImages.length === 0) {
    throw new Error('At least one ready photograph is required for 3D reconstruction.')
  }

  const uploadLimit = Math.min(readyImages.length, 6)
  const staged = readyImages.slice(0, uploadLimit)
  const isMulti = staged.length > 1

  const world_prompt = isMulti
    ? {
        type: 'multi-image',
        multi_image_prompt: staged.map((img, idx) => ({
          content: {
            source: 'media_asset',
            media_asset_id: `asset_${img.id || idx}`
          }
        })),
        text_prompt: options.textPrompt || 'A photorealistic architectural room reconstruction'
      }
    : {
        type: 'image',
        image_prompt: {
          source: 'media_asset',
          media_asset_id: `asset_${staged[0].id || 0}`
        },
        text_prompt: options.textPrompt || 'A photorealistic architectural room reconstruction'
      }

  return {
    display_name: options.displayName || 'InteriorAI Room Reconstruction',
    model: 'marble-1.1',
    world_prompt,
    imagesProcessed: staged.length
  }
}

// 3. Dimension Honesty Calibration testing
function calibrateRoomDimensions(estimatedDims, userConfirmation) {
  if (!userConfirmation || !userConfirmation.confirmedByUser) {
    return {
      length: estimatedDims.length,
      width: estimatedDims.width,
      height: estimatedDims.height,
      isEstimated: true,
      statusLabel: 'Estimated (Unconfirmed)',
      notes: ''
    }
  }

  // Sanitize bounds
  const clampedLength = Math.max(1.5, Math.min(25.0, Number(userConfirmation.calibratedLength) || estimatedDims.length))
  const clampedWidth = Math.max(1.5, Math.min(25.0, Number(userConfirmation.calibratedWidth) || estimatedDims.width))
  const clampedHeight = Math.max(2.0, Math.min(8.0, Number(userConfirmation.calibratedHeight) || estimatedDims.height))

  return {
    length: clampedLength,
    width: clampedWidth,
    height: clampedHeight,
    isEstimated: false,
    statusLabel: 'Confirmed & Measured',
    notes: userConfirmation.notes || ''
  }
}

// 4. Operation status reducer testing
function reduceReconstructionState(currentState, opResponse) {
  if (!opResponse) return currentState

  if (opResponse.done) {
    if (opResponse.error) {
      return {
        status: 'error',
        error: opResponse.error.message || 'Generation failed',
        worldId: null,
        viewerUrl: null
      }
    }
    const worldId = opResponse.worldId || opResponse.metadata?.world_id || opResponse.response?.world_id
    return {
      status: 'ready',
      worldId,
      viewerUrl: worldId ? `https://marble.worldlabs.ai/world/${worldId}` : null,
      meshUrl: opResponse.meshUrl || opResponse.response?.assets?.mesh?.collider_mesh_url || null,
      thumbnailUrl: opResponse.thumbnailUrl || opResponse.response?.assets?.thumbnail_url || null,
      caption: opResponse.caption || opResponse.response?.assets?.caption || null
    }
  }

  return {
    status: 'generating',
    operationId: opResponse.operationId,
    worldId: opResponse.metadata?.world_id || null,
    progressStatus: opResponse.metadata?.progress?.status || 'IN_PROGRESS',
    description: opResponse.metadata?.progress?.description || 'World generation in progress'
  }
}

test('PHOTO-TO-3D RECONSTRUCTION: Multi-Angle Upload Validation', () => {
  // Valid files
  const validJpg = validatePhotoUpload({ name: 'room_angle1.jpg', type: 'image/jpeg', size: 3.5 * 1024 * 1024 })
  assert.equal(validJpg.valid, true)

  const validPng = validatePhotoUpload({ name: 'room_angle2.png', type: 'image/png', size: 8 * 1024 * 1024 })
  assert.equal(validPng.valid, true)

  const validWebp = validatePhotoUpload({ name: 'room_angle3.webp', type: 'image/webp', size: 1.2 * 1024 * 1024 })
  assert.equal(validWebp.valid, true)

  // Invalid file type (e.g. PDF or GIF)
  const invalidType = validatePhotoUpload({ name: 'blueprint.pdf', type: 'application/pdf', size: 500 * 1024 })
  assert.equal(invalidType.valid, false)
  assert.match(invalidType.error, /Unsupported file type/)

  // Oversized file (> 20 MB)
  const oversized = validatePhotoUpload({ name: 'huge_raw.png', type: 'image/png', size: 25 * 1024 * 1024 })
  assert.equal(oversized.valid, false)
  assert.match(oversized.error, /exceeds the 20 MB limit/)
})

test('PHOTO-TO-3D RECONSTRUCTION: Single vs Multi-Angle Payload Synthesis', () => {
  // Single image
  const single = [{ id: 'img_1', name: 'angle1.jpg', status: 'ready', dataUrl: 'data:image/jpeg;base64,AAA' }]
  const singlePayload = prepareReconstructionPayload(single, { roomType: 'Living Room' })
  assert.equal(singlePayload.world_prompt.type, 'image')
  assert.equal(singlePayload.world_prompt.image_prompt.source, 'media_asset')
  assert.equal(singlePayload.imagesProcessed, 1)

  // Multi-angle (3 photos)
  const multi = [
    { id: 'img_1', name: 'angle1.jpg', status: 'ready', dataUrl: 'data:image/jpeg;base64,AAA' },
    { id: 'img_2', name: 'angle2.jpg', status: 'ready', dataUrl: 'data:image/jpeg;base64,BBB' },
    { id: 'img_3', name: 'angle3.jpg', status: 'ready', dataUrl: 'data:image/jpeg;base64,CCC' }
  ]
  const multiPayload = prepareReconstructionPayload(multi, { roomType: 'Living Room' })
  assert.equal(multiPayload.world_prompt.type, 'multi-image')
  assert.equal(multiPayload.world_prompt.multi_image_prompt.length, 3)
  assert.equal(multiPayload.imagesProcessed, 3)

  // Cap at 6 photos maximum for World Labs staging
  const excess = Array.from({ length: 8 }, (_, i) => ({
    id: `img_${i}`,
    name: `angle_${i}.jpg`,
    status: 'ready',
    dataUrl: 'data:image/jpeg;base64,AAA'
  }))
  const cappedPayload = prepareReconstructionPayload(excess)
  assert.equal(cappedPayload.world_prompt.multi_image_prompt.length, 6)
  assert.equal(cappedPayload.imagesProcessed, 6)

  // Empty queue rejection
  assert.throws(() => prepareReconstructionPayload([]), /At least one ready photograph/)
})

test('PHOTO-TO-3D RECONSTRUCTION: Honest Dimension Calibration & Verification', () => {
  const estimated = { length: 5.4, width: 4.1, height: 2.8 }

  // Unconfirmed baseline
  const unconfirmed = calibrateRoomDimensions(estimated, { confirmedByUser: false })
  assert.equal(unconfirmed.isEstimated, true)
  assert.equal(unconfirmed.length, 5.4)
  assert.equal(unconfirmed.statusLabel, 'Estimated (Unconfirmed)')

  // User confirmed calibration with laser measurement
  const confirmed = calibrateRoomDimensions(estimated, {
    confirmedByUser: true,
    calibratedLength: 5.15,
    calibratedWidth: 3.95,
    calibratedHeight: 2.85,
    notes: 'Laser distance meter measurement'
  })
  assert.equal(confirmed.isEstimated, false)
  assert.equal(confirmed.length, 5.15)
  assert.equal(confirmed.width, 3.95)
  assert.equal(confirmed.statusLabel, 'Confirmed & Measured')
  assert.equal(confirmed.notes, 'Laser distance meter measurement')

  // Boundary clamping tests on out-of-range user inputs
  const clamped = calibrateRoomDimensions(estimated, {
    confirmedByUser: true,
    calibratedLength: 99.0, // excessive
    calibratedWidth: 0.5,   // too narrow
    calibratedHeight: 15.0  // excessive ceiling
  })
  assert.equal(clamped.length, 25.0) // clamped to max
  assert.equal(clamped.width, 1.5)   // clamped to min
  assert.equal(clamped.height, 8.0)  // clamped to max
})

test('PHOTO-TO-3D RECONSTRUCTION: Real Asynchronous Operation Status Lifecycle', () => {
  const initialState = { status: 'idle' }

  // 1. In-progress polling status
  const runningOp = {
    operationId: 'op_test_123',
    done: false,
    metadata: {
      progress: {
        status: 'IN_PROGRESS',
        description: 'Generating neural 3D Gaussian splatting'
      },
      world_id: 'world_marble_456'
    }
  }
  const inProgressState = reduceReconstructionState(initialState, runningOp)
  assert.equal(inProgressState.status, 'generating')
  assert.equal(inProgressState.description, 'Generating neural 3D Gaussian splatting')
  assert.equal(inProgressState.worldId, 'world_marble_456')

  // 2. Successful completion status
  const succeededOp = {
    operationId: 'op_test_123',
    done: true,
    worldId: 'world_marble_456',
    meshUrl: 'https://cdn.marble.worldlabs.ai/world_marble_456/collider.glb',
    thumbnailUrl: 'https://cdn.marble.worldlabs.ai/world_marble_456/thumb.webp',
    caption: 'A photorealistic reconstructed modern living room'
  }
  const completedState = reduceReconstructionState(inProgressState, succeededOp)
  assert.equal(completedState.status, 'ready')
  assert.equal(completedState.viewerUrl, 'https://marble.worldlabs.ai/world/world_marble_456')
  assert.equal(completedState.meshUrl, 'https://cdn.marble.worldlabs.ai/world_marble_456/collider.glb')
  assert.ok(completedState.caption)

  // 3. Error status handling
  const failedOp = {
    operationId: 'op_fail_789',
    done: true,
    error: { message: 'Image resolution too low or heavily compressed' }
  }
  const errorState = reduceReconstructionState(inProgressState, failedOp)
  assert.equal(errorState.status, 'error')
  assert.match(errorState.error, /Image resolution too low/)
})
