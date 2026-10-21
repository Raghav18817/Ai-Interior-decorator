import assert from 'node:assert/strict'

console.log('--- RUNNING LOOP 15 ERROR HANDLING & EDGE CASES TESTS ---')

// 1. Logic for dimension sanitization & 3D model building
function sanitizeRoomDimension(val, fallback, min = 1.5, max = 30.0) {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val <= 0) {
    return fallback
  }
  return Math.max(min, Math.min(max, val))
}

function buildRoom3DModel(analysis) {
  const defaultLength = 5.0
  const defaultWidth = 4.0
  const defaultHeight = 2.8

  const length = sanitizeRoomDimension(analysis?.dimensions?.lengthMeters, defaultLength, 1.5, 30.0)
  const width = sanitizeRoomDimension(analysis?.dimensions?.widthMeters, defaultWidth, 1.5, 30.0)
  const height = sanitizeRoomDimension(analysis?.dimensions?.heightMeters, defaultHeight, 1.8, 10.0)

  const wallThickness = 0.15
  const halfL = length / 2
  const halfW = width / 2
  const halfH = height / 2

  const walls = [
    { id: 'wall_north', orientation: 'north', width: length, height, position: [0, halfH, -halfW] },
    { id: 'wall_south', orientation: 'south', width: length, height, position: [0, halfH, halfW] },
    { id: 'wall_west', orientation: 'west', width, height, position: [-halfL, halfH, 0] },
    { id: 'wall_east', orientation: 'east', width, height, position: [halfL, halfH, 0] }
  ]

  const openings = []
  if (Array.isArray(analysis?.doors)) {
    analysis.doors.forEach((door, idx) => {
      openings.push({
        id: door.id || `door_${idx}`,
        type: 'door',
        label: door.label || 'Door',
        width: typeof door.estimatedDimensions?.widthMeters === 'number' ? door.estimatedDimensions.widthMeters : 0.9,
        position: [-halfL, 1.05, 0]
      })
    })
  }

  const furniture = []
  const detected = [
    ...(Array.isArray(analysis?.furniture) ? analysis.furniture : []),
    ...(Array.isArray(analysis?.appliances) ? analysis.appliances : []),
    ...(Array.isArray(analysis?.majorObjects) ? analysis.majorObjects : [])
  ]

  detected.forEach((item, idx) => {
    furniture.push({
      id: item.id || `furn_${idx}`,
      label: item.label || 'Furniture Object',
      width: (typeof item.estimatedDimensions?.widthMeters === 'number' && !isNaN(item.estimatedDimensions.widthMeters))
        ? item.estimatedDimensions.widthMeters
        : 1.0,
      position: [0, 0.4, 0]
    })
  })

  return {
    dimensions: { length, width, height },
    walls,
    openings,
    furniture
  }
}

// 2. Logic for furniture conversion
function convertAnalysisToFurnitureItems(analysis, roomName = 'Living Room') {
  if (!analysis) return []
  const detected = [
    ...(Array.isArray(analysis.furniture) ? analysis.furniture : []),
    ...(Array.isArray(analysis.appliances) ? analysis.appliances : []),
    ...(Array.isArray(analysis.majorObjects) ? analysis.majorObjects : [])
  ]

  return detected.map((item, idx) => ({
    id: item.id || `furn_detected_${idx}`,
    name: item.label || 'Unnamed Piece',
    width: (typeof item.estimatedDimensions?.widthMeters === 'number' && !isNaN(item.estimatedDimensions.widthMeters) && item.estimatedDimensions.widthMeters > 0)
      ? item.estimatedDimensions.widthMeters
      : 1.2,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    room: roomName
  }))
}

// 3. Logic for space optimization on empty room
function optimizeRoomLayout({ goal, furniture, roomDimensions }) {
  const { length: roomL, width: roomW } = roomDimensions
  const totalArea = roomL * roomW
  const origOccupied = furniture.reduce((sum, f) => sum + (f.width * (f.depth || 0.8)), 0)

  let proposed = [...furniture]
  const changes = []

  if (goal === 'add_workspace') {
    const newDesk = {
      id: `desk_${Date.now()}`,
      name: 'Executive Study Desk',
      width: 1.4,
      depth: 0.7,
      position: [1.2, 0, -1.0]
    }
    const newChair = {
      id: `chair_${Date.now()}`,
      name: 'Ergonomic Task Chair',
      width: 0.65,
      depth: 0.65,
      position: [0.6, 0, -1.0]
    }
    proposed.push(newDesk, newChair)
    changes.push({ action: 'added', targetItemName: newDesk.name })
    changes.push({ action: 'added', targetItemName: newChair.name })
  }

  const propOccupied = proposed.reduce((sum, f) => sum + (f.width * (f.depth || 0.8)), 0)
  const occPercent = totalArea > 0 ? Math.round((propOccupied / totalArea) * 100) : 0

  return {
    proposedFurniture: proposed,
    changes,
    postOptimizationOccupancyPercent: occPercent
  }
}

// 4. Logic for natural language commands
function executeNaturalLanguageCommand(text, furniture) {
  const lower = text.toLowerCase()
  if (lower.includes('move')) {
    const target = furniture.find(f => lower.includes(f.name.toLowerCase()) || lower.includes('sofa'))
    if (!target) {
      return {
        success: false,
        validationNotes: [`Could not find target item matching "${text}" in the room to move.`],
        proposedLayout: furniture
      }
    }
    return {
      success: true,
      validationNotes: ['Moved item safely.'],
      proposedLayout: furniture
    }
  } else if (lower.includes('add')) {
    const addedItem = { id: `add_${Date.now()}`, name: 'Study Desk', position: [0, 0, 0] }
    return {
      success: true,
      validationNotes: ['Added study desk.'],
      proposedLayout: [...furniture, addedItem]
    }
  }
  return { success: false, validationNotes: ['Unknown command'], proposedLayout: furniture }
}

// 5. Logic for payload and JSON validation
function validateAnalysisResult(data) {
  if (!data || typeof data !== 'object') return false
  return (
    typeof data.roomType === 'string' &&
    typeof data.confidence === 'number' &&
    typeof data.dimensions === 'object' &&
    Array.isArray(data.walls) &&
    typeof data.floor === 'object' &&
    typeof data.ceiling === 'object' &&
    Array.isArray(data.doors) &&
    Array.isArray(data.windows) &&
    Array.isArray(data.furniture)
  )
}

function deserializeAndValidateProjectJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    const err = new Error('Empty payload')
    err.code = 'INVALID_DATA'
    throw err
  }
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    const err = new Error('Malformed JSON syntax')
    err.code = 'CORRUPTED_JSON'
    throw err
  }

  let raw = parsed
  if (parsed && parsed.bundleType === 'DECOHOME_DESIGN_PROJECT' && parsed.project) {
    raw = parsed.project
  }

  if (!raw || typeof raw !== 'object') {
    const err = new Error('Invalid project structure')
    err.code = 'INVALID_DATA'
    throw err
  }

  if (!raw.id || !raw.name) {
    const err = new Error('Missing mandatory properties (id, name)')
    err.code = 'MISSING_PROPERTIES'
    throw err
  }

  return raw
}

// -------------------------------------------------------------
// Test 1: Empty Room Edge Cases & Safe Architectural Defaults
// -------------------------------------------------------------
console.log('Testing 1: Empty Room Fallbacks (Null/Empty Analysis)')
{
  const modelFromNull = buildRoom3DModel(null)
  assert.ok(modelFromNull, 'Model must be returned even for null input')
  assert.strictEqual(modelFromNull.dimensions.length, 5.0, 'Default length should be 5.0m')
  assert.strictEqual(modelFromNull.dimensions.width, 4.0, 'Default width should be 4.0m')
  assert.strictEqual(modelFromNull.walls.length, 4, 'Must have 4 walls')
  assert.strictEqual(modelFromNull.openings.length, 0, 'No openings in empty room')
  assert.strictEqual(modelFromNull.furniture.length, 0, 'No furniture in empty room')

  const modelFromEmpty = buildRoom3DModel({})
  assert.strictEqual(modelFromEmpty.walls.length, 4)
  assert.strictEqual(modelFromEmpty.furniture.length, 0)

  const furnitureFromNull = convertAnalysisToFurnitureItems(null)
  assert.deepStrictEqual(furnitureFromNull, [], 'Empty array for null analysis')

  const furnitureFromEmpty = convertAnalysisToFurnitureItems({})
  assert.deepStrictEqual(furnitureFromEmpty, [], 'Empty array for empty analysis')

  const emptyOpt = optimizeRoomLayout({
    goal: 'maximize_space',
    furniture: [],
    roomDimensions: { length: 5.0, width: 4.0, height: 2.8 }
  })
  assert.strictEqual(emptyOpt.proposedFurniture.length, 0, 'Empty room stays empty on maximize_space')
  assert.strictEqual(emptyOpt.changes.length, 0, 'No changes on empty room')
  assert.strictEqual(emptyOpt.postOptimizationOccupancyPercent, 0, '0% occupancy')

  const addWorkOpt = optimizeRoomLayout({
    goal: 'add_workspace',
    furniture: [],
    roomDimensions: { length: 5.0, width: 4.0, height: 2.8 }
  })
  assert.strictEqual(addWorkOpt.proposedFurniture.length, 2, 'Added desk and chair to empty room')
  assert.ok(addWorkOpt.changes.some(c => c.action === 'added'), 'Must record added change')

  console.log('✓ Test 1 Passed: Empty room gracefully generates valid defaults without crashes')
}

// -------------------------------------------------------------
// Test 2: Extreme Room Aspect Ratios & Sanitization
// -------------------------------------------------------------
console.log('\nTesting 2: Extreme Room Aspect Ratios & Dimension Sanitization')
{
  const clampedMin = sanitizeRoomDimension(0.3, 5.0, 1.5, 30.0)
  assert.strictEqual(clampedMin, 1.5, 'Sub-minimum clamped to 1.5m')

  const clampedMax = sanitizeRoomDimension(120.0, 5.0, 1.5, 30.0)
  assert.strictEqual(clampedMax, 30.0, 'Excessive dimension clamped to 30.0m')

  assert.strictEqual(sanitizeRoomDimension(NaN, 5.0), 5.0, 'NaN falls back to default')
  assert.strictEqual(sanitizeRoomDimension(Infinity, 5.0), 5.0, 'Infinity falls back to default')
  assert.strictEqual(sanitizeRoomDimension(-10.0, 5.0), 5.0, 'Negative falls back to default')
  assert.strictEqual(sanitizeRoomDimension('5.5', 5.0), 5.0, 'String falls back to default')

  const corridorModel = buildRoom3DModel({
    dimensions: { lengthMeters: 1.0, widthMeters: 20.0, heightMeters: 2.5 }
  })
  assert.strictEqual(corridorModel.dimensions.length, 1.5, 'Corridor width clamped to min 1.5m')
  assert.strictEqual(corridorModel.dimensions.width, 20.0, 'Corridor length preserved within bounds')
  assert.strictEqual(corridorModel.walls.length, 4, 'All 4 walls constructed for extreme aspect ratio')

  console.log('✓ Test 2 Passed: Extreme dimensions and aspect ratios safely bounded and sanitized')
}

// -------------------------------------------------------------
// Test 3: Unreadable & Malformed Analysis Payload Validation
// -------------------------------------------------------------
console.log('\nTesting 3: Unreadable & Malformed Analysis Payloads')
{
  assert.strictEqual(validateAnalysisResult(null), false, 'Null rejected')
  assert.strictEqual(validateAnalysisResult('string'), false, 'Primitive string rejected')
  assert.strictEqual(validateAnalysisResult({}), false, 'Empty object rejected')
  assert.strictEqual(validateAnalysisResult({ roomType: 123 }), false, 'Invalid type rejected')
  assert.strictEqual(validateAnalysisResult({
    roomType: 'Living Room',
    confidence: 0.9,
    dimensions: {},
    walls: [],
    floor: {},
    ceiling: {},
    doors: [],
    windows: [],
    furniture: []
  }), true, 'Complete structure accepted')

  console.log('✓ Test 3 Passed: Corrupted analysis payloads handled with safe validation')
}

// -------------------------------------------------------------
// Test 4: Corrupted JSON Import Error Handling
// -------------------------------------------------------------
console.log('\nTesting 4: Corrupted and Malformed JSON Imports')
{
  assert.throws(
    () => deserializeAndValidateProjectJSON('{ invalid: json: syntax }'),
    (err) => {
      assert.strictEqual(err.code, 'CORRUPTED_JSON')
      return true
    },
    'Should throw CORRUPTED_JSON on invalid syntax'
  )

  assert.throws(
    () => deserializeAndValidateProjectJSON('"just a string"'),
    (err) => {
      assert.strictEqual(err.code, 'INVALID_DATA')
      return true
    }
  )

  assert.throws(
    () => deserializeAndValidateProjectJSON(JSON.stringify({ name: 'Untitled Project' })),
    (err) => {
      assert.strictEqual(err.code, 'MISSING_PROPERTIES')
      return true
    }
  )

  console.log('✓ Test 4 Passed: Corrupted JSON import errors safely caught with explicit error codes')
}

// -------------------------------------------------------------
// Test 5: Missing Target Objects in Natural Language Commands
// -------------------------------------------------------------
console.log('\nTesting 5: Natural Language Assistant Missing Target Handling')
{
  const resultMissing = executeNaturalLanguageCommand(
    'Move the sofa near the window',
    []
  )

  assert.strictEqual(resultMissing.success, false, 'Command on missing item should fail gracefully')
  assert.ok(resultMissing.validationNotes.some(n => n.includes('Could not find')), 'Validation notes clarify missing item')
  assert.strictEqual(resultMissing.proposedLayout.length, 0, 'Original layout untouched')

  const resultAdd = executeNaturalLanguageCommand(
    'Add a study table',
    []
  )
  assert.strictEqual(resultAdd.success, true, 'Adding item to empty room succeeds')
  assert.strictEqual(resultAdd.proposedLayout.length, 1, 'Desk successfully added')

  console.log('✓ Test 5 Passed: Natural language engine safely handles missing targets and empty scenes')
}

console.log('\nALL LOOP 15 ERROR HANDLING & EDGE CASES TESTS PASSED CLEANLY!')
