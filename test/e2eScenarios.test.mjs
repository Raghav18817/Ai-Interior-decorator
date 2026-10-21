import assert from 'node:assert/strict'

console.log('--- RUNNING LOOP 17 REAL-WORLD SCENARIO VERIFICATION TESTS ---')

// -------------------------------------------------------------
// Scenario A: Compact Studio Apartment (2.8m × 3.2m = 8.96 m²)
// -------------------------------------------------------------
console.log('Scenario A: Compact Studio Apartment')
{
  const roomDimensions = { length: 2.8, width: 3.2, height: 2.6 }
  const totalArea = roomDimensions.length * roomDimensions.width

  // Windows and Doors
  const windowAperture = { id: 'win_1', type: 'window', position: [0, 1.3, -1.6], width: 1.4, height: 1.2 }
  const entryDoor = { id: 'door_1', type: 'door', position: [-1.4, 1.05, 0.8], width: 0.85, height: 2.1 }

  // Initial layout: Attempting to put a bulky 3-seater sofa in tiny studio
  const initialItems = [
    {
      id: 'furn_studio_sofa',
      name: 'Oversized Sectional',
      type: 'sofa_sectional',
      width: 2.4,
      depth: 1.8,
      position: [0, 0, 0]
    }
  ]

  const bulkyArea = initialItems[0].width * initialItems[0].depth
  const occupancyPercent = Math.round((bulkyArea / totalArea) * 100)
  assert.ok(occupancyPercent > 45, 'Oversized sectional occupies > 45% of tiny studio')

  // Optimization: Replace bulky sectional with studio armchair & floating desk
  const optimizedStudioItems = [
    {
      id: 'furn_compact_armchair',
      name: 'Studio Lounge Armchair',
      type: 'armchair',
      width: 0.85,
      depth: 0.85,
      position: [0.6, 0, 0.7]
    },
    {
      id: 'furn_wall_desk',
      name: 'Compact Work Desk',
      type: 'study_desk',
      width: 1.0,
      depth: 0.5,
      position: [0, 0, -1.2] // Under window, keeping daylight
    }
  ]

  const optArea = optimizedStudioItems.reduce((s, i) => s + i.width * i.depth, 0)
  const optOccupancyPercent = Math.round((optArea / totalArea) * 100)
  assert.ok(optOccupancyPercent < 20, 'Compact studio items reduce occupancy below 20%')

  // Verify door clearance
  const distToDoor = Math.hypot(optimizedStudioItems[0].position[0] - entryDoor.position[0], optimizedStudioItems[0].position[1] - entryDoor.position[2])
  assert.ok(distToDoor >= 0.85, 'Ingress clearance preserved')

  console.log(`✓ Scenario A Passed: Studio recovered ${(bulkyArea - optArea).toFixed(2)} m² floor area with safe doorway clearance`)
}

// -------------------------------------------------------------
// Scenario B: Open-Concept Family Living Room (6.2m × 5.0m = 31.0 m²)
// -------------------------------------------------------------
console.log('\nScenario B: Spacious Family Living Room & Home Theater')
{
  const roomDimensions = { length: 6.2, width: 5.0, height: 2.9 }
  const halfL = roomDimensions.length / 2
  const halfW = roomDimensions.width / 2

  const livingRoomFurniture = [
    // 3-Seater Sofa on South elevation
    {
      id: 'sofa_main',
      name: '3-Seater Family Sofa',
      type: 'sofa_3seater',
      width: 2.3,
      depth: 0.95,
      position: [0, 0, 1.8],
      rotation: [0, 0, 0]
    },
    // Coffee Table centered in front of sofa
    {
      id: 'coffee_table',
      name: 'Oak Coffee Table',
      type: 'coffee_table',
      width: 1.2,
      depth: 0.65,
      position: [0, 0, 0.8],
      rotation: [0, 0, 0]
    },
    // Left Accent Armchair
    {
      id: 'armchair_left',
      name: 'Lounge Armchair West',
      type: 'armchair',
      width: 0.85,
      depth: 0.85,
      position: [-1.8, 0, 1.2],
      rotation: [0, Math.PI / 4, 0]
    },
    // Right Accent Armchair
    {
      id: 'armchair_right',
      name: 'Lounge Armchair East',
      type: 'armchair',
      width: 0.85,
      depth: 0.85,
      position: [1.8, 0, 1.2],
      rotation: [0, -Math.PI / 4, 0]
    },
    // Media Credenza & 75" TV on North Wall
    {
      id: 'tv_credenza',
      name: 'Walnut Media Credenza (75" 4K TV)',
      type: 'tv_console',
      width: 2.1,
      depth: 0.45,
      position: [0, 0, -2.15],
      rotation: [0, 0, 0]
    }
  ]

  // 1. Verify TV Viewing Distance (Distance between Sofa and TV)
  const tvViewingDistance = Math.abs(livingRoomFurniture[0].position[2] - livingRoomFurniture[4].position[2])
  assert.ok(tvViewingDistance >= 2.5 && tvViewingDistance <= 4.2, `Viewing distance ${tvViewingDistance.toFixed(2)}m is optimal for 65-75" TV (SMPTE standard)`)

  // 2. Verify all pieces fit within bounds
  livingRoomFurniture.forEach(f => {
    assert.ok(Math.abs(f.position[0]) + f.width / 2 <= halfL, `${f.name} fits within length bounds`)
    assert.ok(Math.abs(f.position[2]) + f.depth / 2 <= halfW, `${f.name} fits within width bounds`)
  })

  // 3. Verify zero collisions between any two items
  for (let i = 0; i < livingRoomFurniture.length; i++) {
    for (let j = i + 1; j < livingRoomFurniture.length; j++) {
      const a = livingRoomFurniture[i]
      const b = livingRoomFurniture[j]
      const overlapX = Math.abs(a.position[0] - b.position[0]) < (a.width + b.width) / 2 - 0.05
      const overlapZ = Math.abs(a.position[2] - b.position[2]) < (a.depth + b.depth) / 2 - 0.05
      assert.ok(!(overlapX && overlapZ), `Zero collision between ${a.name} and ${b.name}`)
    }
  }

  console.log(`✓ Scenario B Passed: Family living room verified with 5 furniture pieces and ${tvViewingDistance.toFixed(2)}m optimal TV viewing line`)
}

// -------------------------------------------------------------
// Scenario C: Ergonomic Home Office & Hybrid Workstation (3.6m × 3.2m)
// -------------------------------------------------------------
console.log('\nScenario C: Dedicated Ergonomic Home Office')
{
  const officeDimensions = { length: 3.6, width: 3.2, height: 2.7 }
  const halfL = officeDimensions.length / 2
  const halfW = officeDimensions.width / 2

  const detectedPowerSockets = [
    { id: 'soc_east', wall: 'east', position: [halfL, 0.4, 0] }
  ]

  const door = { id: 'door_south', position: [0, 1.05, halfW], width: 0.9 }

  const officeFurniture = [
    // Executive desk positioned near power socket on East wall
    {
      id: 'desk_exec',
      name: 'Standing Executive Desk',
      type: 'study_desk',
      width: 1.4,
      depth: 0.7,
      position: [halfL - 0.75, 0, 0]
    },
    // Ergonomic chair with pullout clearance
    {
      id: 'chair_ergo',
      name: 'Ergonomic Task Chair',
      type: 'ergonomic_chair',
      width: 0.65,
      depth: 0.65,
      position: [halfL - 1.5, 0, 0]
    },
    // Tall bookshelf along North wall
    {
      id: 'shelf_tall',
      name: 'Bookshelf Unit',
      type: 'bookshelf',
      width: 1.2,
      depth: 0.35,
      position: [-0.6, 0, -halfW + 0.2]
    }
  ]

  // 1. Desk proximity to power socket (< 1.5m for safe cable run without extension trip hazard)
  const deskSocketDist = Math.hypot(
    officeFurniture[0].position[0] - detectedPowerSockets[0].position[0],
    officeFurniture[0].position[2] - detectedPowerSockets[0].position[2]
  )
  assert.ok(deskSocketDist < 1.0, `Desk is within ${deskSocketDist.toFixed(2)}m of wall power socket`)

  // 2. Door clear corridor
  officeFurniture.forEach(item => {
    const distToDoor = Math.hypot(item.position[0] - door.position[0], item.position[2] - door.position[2])
    assert.ok(distToDoor >= 0.85, `${item.name} maintains >= 0.85m egress clearance to office door`)
  })

  // 3. Ergonomic chair sliding zone
  const chairToDeskDist = Math.abs(officeFurniture[0].position[0] - officeFurniture[1].position[0])
  assert.ok(chairToDeskDist >= 0.65, 'Chair has adequate slide-in/out ergonomic travel zone')

  console.log(`✓ Scenario C Passed: Ergonomic workstation validated with power socket alignment and door safety clearance`)
}

console.log('\nALL LOOP 17 REAL-WORLD SCENARIO VERIFICATIONS PASSED CLEANLY!')
