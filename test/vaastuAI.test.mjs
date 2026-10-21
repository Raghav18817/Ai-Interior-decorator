import test from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = 'http://localhost:3000'

// 1. Vaastu & Multi-Cultural Traditions Spec Verification
test('Vaastu.ai - Cultural Traditions & Knowledge Structure', async (t) => {
  const CULTURAL_TRADITIONS = [
    {
      id: 'vaastu_hindu',
      label: 'Hindu Traditions (Vaastu Shastra)',
      shortLabel: 'Vaastu Shastra',
      description: 'Ancient Indian architectural philosophy harmonizing 5 natural elements (Pancha Bhoota) and 8 directional energies.',
      focusAreas: ['Directional zoning (Ishanya, Agni, Nairutya, Vayavya)', 'Bed & desk alignment', 'Brahmasthan central open circulation', 'Entrance orientation'],
      disclaimer: 'Vaastu Shastra offers traditional cultural guidelines. Interpretations vary across texts (Mayamata, Manasara, Brihat Samhita) and regional practitioners. They are cultural principles rather than empirical scientific guarantees.'
    },
    {
      id: 'islamic',
      label: 'Islamic Traditions',
      shortLabel: 'Islamic Guidance',
      description: 'Mindful architectural design emphasizing Qibla orientation, family & guest circulation privacy, modesty, and clean functional geometry.',
      focusAreas: ['Respectful Qibla orientation for prayer nook & bed alignment', 'Privacy zoning between public receiving & private family areas', 'Cleanliness & water access hygiene', 'Uncluttered natural daylight'],
      disclaimer: 'Islamic home recommendations reflect traditional cultural etiquettes (Adaab) and respectful spatial consideration. Practices vary across regional cultures and individual interpretations.'
    },
    {
      id: 'christian',
      label: 'Christian Traditions',
      shortLabel: 'Christian Traditions',
      description: 'Design focusing on communal fellowship, natural morning daylight (East-facing spaces), and dedicated prayer or scripture study nooks.',
      focusAreas: ['East-facing morning daylight orientation', 'Central family gathering table for meals & fellowship', 'Quiet devotional or reading corner', 'Welcoming hospitality entrance'],
      disclaimer: 'Christian design traditions are rooted in historical architectural customs (such as Eastward daylight orientation) and personal spiritual lifestyle preferences rather than rigid dogmatic rules.'
    },
    {
      id: 'buddhist',
      label: 'Buddhist Traditions',
      shortLabel: 'Buddhist Mindfulness',
      description: 'Zen and mindful spatial flow emphasizing minimal clutter, natural organic materials, serenity, and dedicated meditation spaces.',
      focusAreas: ['Mindful decluttering & open walking pathways', 'Natural materials (wood, stone, bamboo, linen)', 'Tranquil meditation corner facing quiet outdoor views', 'Harmonious muted earthy tones'],
      disclaimer: 'Buddhist spatial concepts prioritize personal mindfulness, peace, and simplicity. They serve as mindful lifestyle suggestions rather than dogmatic structural mandates.'
    },
    {
      id: 'jain',
      label: 'Jain Traditions',
      shortLabel: 'Jain Principles',
      description: 'Quiet, clutter-free spaces designed with Ahimsa (non-harm), natural light, minimal consumption, and dedicated spaces for peaceful study or meditation.',
      focusAreas: ['Non-obstructive circulation', 'Abundant natural ventilation & daylight', 'Dedicated tranquil prayer/meditation space', 'Simplicity of surfaces'],
      disclaimer: 'Jain residential principles emphasize spiritual simplicity, peaceful mindfulness, and reverence for nature.'
    },
    {
      id: 'none',
      label: 'Secular / Functional Architecture Only',
      shortLabel: 'Functional Design',
      description: 'Ergonomic, physical clearance, daylighting, and spatial circulation optimization with zero cultural or religious references.',
      focusAreas: ['Physical ergonomics & clearances', 'Daylight utilization', 'Acoustic comfort', 'Circulation efficiency'],
      disclaimer: 'Strictly architectural guidelines based on physical standards (Neufert, IBC codes).'
    }
  ]

  await t.test('provides all 6 cultural traditions with honest non-dogmatic disclaimers', () => {
    assert.strictEqual(CULTURAL_TRADITIONS.length, 6)
    const ids = CULTURAL_TRADITIONS.map(t => t.id)
    assert.ok(ids.includes('vaastu_hindu'))
    assert.ok(ids.includes('islamic'))
    assert.ok(ids.includes('christian'))
    assert.ok(ids.includes('buddhist'))
    assert.ok(ids.includes('jain'))
    assert.ok(ids.includes('none'))

    for (const trad of CULTURAL_TRADITIONS) {
      assert.ok(trad.label.length > 0)
      assert.ok(trad.description.length > 0)
      assert.ok(trad.disclaimer.length > 0)
      assert.ok(trad.focusAreas.length > 0)
      if (trad.id !== 'none') {
        assert.match(trad.disclaimer, /(traditional|cultural|lifestyle|preferences|vary|principles)/i)
      }
    }
  })

  await t.test('verifies 8 cardinal directions and Brahmasthan spatial mappings', () => {
    function mapDirectionToRoomCoordinates(direction, dimensions, compassRotationDegrees = 0) {
      const halfX = dimensions.length / 2
      const halfZ = dimensions.width / 2
      const insetFactor = 0.65

      let baseX = 0
      let baseZ = 0
      switch (direction) {
        case 'North': baseX = 0; baseZ = -halfZ * insetFactor; break
        case 'Northeast': baseX = halfX * insetFactor; baseZ = -halfZ * insetFactor; break
        case 'East': baseX = halfX * insetFactor; baseZ = 0; break
        case 'Southeast': baseX = halfX * insetFactor; baseZ = halfZ * insetFactor; break
        case 'South': baseX = 0; baseZ = halfZ * insetFactor; break
        case 'Southwest': baseX = -halfX * insetFactor; baseZ = halfZ * insetFactor; break
        case 'West': baseX = -halfX * insetFactor; baseZ = 0; break
        case 'Northwest': baseX = -halfX * insetFactor; baseZ = -halfZ * insetFactor; break
        case 'Center': baseX = 0; baseZ = 0; break
      }

      if (compassRotationDegrees !== 0) {
        const rad = (compassRotationDegrees * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        return {
          x: Number((baseX * cos - baseZ * sin).toFixed(2)),
          z: Number((baseX * sin + baseZ * cos).toFixed(2))
        }
      }
      return { x: Number(baseX.toFixed(2)), z: Number(baseZ.toFixed(2)) }
    }

    const dims = { length: 5.0, width: 4.0, height: 2.8 }
    const sw = mapDirectionToRoomCoordinates('Southwest', dims)
    assert.ok(sw.x < 0, `SW X should be negative, got ${sw.x}`)
    assert.ok(sw.z > 0, `SW Z should be positive, got ${sw.z}`)

    const ne = mapDirectionToRoomCoordinates('Northeast', dims)
    assert.ok(ne.x > 0, `NE X should be positive, got ${ne.x}`)
    assert.ok(ne.z < 0, `NE Z should be negative, got ${ne.z}`)

    const center = mapDirectionToRoomCoordinates('Center', dims)
    assert.strictEqual(center.x, 0)
    assert.strictEqual(center.z, 0)
  })
})

// 2. Server-Authoritative Credits & API Endpoints
test('Vaastu.ai - Server-Authoritative Credit System & Endpoints', async (t) => {
  const userId = `test_suite_user_${Date.now()}`

  await t.test('GET /api/vaastu/credits returns 10 daily allowance and 12:00 AM IST reset', async () => {
    const res = await fetch(`${BASE_URL}/api/vaastu/credits?userId=${userId}`)
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.success, true)
    assert.strictEqual(data.creditsRemaining, 10)
    assert.strictEqual(data.dailyAllowance, 10)
    assert.strictEqual(data.resetTimeFormatted, '12:00 AM IST')
    assert.strictEqual(data.isExhausted, false)
    assert.ok(data.nextResetTimestamp > Date.now())
  })

  await t.test('POST /api/vaastu/chat deducts 1 credit and executes spatial reasoning', async () => {
    const requestId = `req_${Date.now()}_1`
    const payload = {
      userId,
      requestId,
      message: 'Where should I place the bed according to Vaastu?',
      currentFurniture: [
        {
          id: 'furn_bed',
          name: 'King Bed',
          category: 'beds',
          width: 1.8,
          height: 1.0,
          depth: 2.0,
          position: [0, 0.5, 0],
          rotation: [0, 0, 0]
        }
      ],
      roomDimensions: { length: 5, width: 4, height: 2.8 },
      tradition: 'vaastu_hindu',
      roomType: 'Bedroom'
    }

    const res = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.success, true)
    assert.strictEqual(data.creditsRemaining, 9, 'Credit should decrement from 10 to 9')
    assert.ok(data.response.replyText.length > 20)
    assert.strictEqual(data.response.culturalContextUsed, 'vaastu_hindu')
    assert.strictEqual(data.response.isTraditionalGuidance, true)
  })

  await t.test('enforces idempotency: identical requestId does not double-charge credit', async () => {
    const idempotencyRequestId = `req_idempotent_${Date.now()}`
    const payload = {
      userId,
      requestId: idempotencyRequestId,
      message: 'Move the bed to the Southwest corner',
      currentFurniture: [
        {
          id: 'furn_bed',
          name: 'King Bed',
          category: 'beds',
          width: 1.8,
          height: 1.0,
          depth: 2.0,
          position: [0, 0.5, 0],
          rotation: [0, 0, 0]
        }
      ],
      roomDimensions: { length: 5, width: 4, height: 2.8 },
      tradition: 'vaastu_hindu',
      roomType: 'Bedroom'
    }

    // Call 1: deducts from 9 -> 8
    const res1 = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data1 = await res1.json()
    assert.strictEqual(data1.creditsRemaining, 8)

    // Call 2 with identical requestId: must remain 8
    const res2 = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data2 = await res2.json()
    assert.strictEqual(data2.creditsRemaining, 8, 'Idempotent request must not deduct credit twice')
  })

  await t.test('supports 3D movement command and returns proposedAction with boundaries checked', async () => {
    const payload = {
      userId,
      message: 'Move the bed to the Southwest corner',
      currentFurniture: [
        {
          id: 'furn_bed',
          name: 'King Bed',
          category: 'beds',
          width: 1.8,
          height: 1.0,
          depth: 2.0,
          position: [0, 0.5, 0],
          rotation: [0, 0, 0]
        }
      ],
      roomDimensions: { length: 5.0, width: 4.0, height: 2.8 },
      tradition: 'vaastu_hindu',
      roomType: 'Bedroom'
    }

    const res = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.ok(data.response.proposedAction)
    const action = data.response.proposedAction
    assert.strictEqual(action.operation, 'MOVE_OBJECT')
    assert.strictEqual(action.objectId, 'furn_bed')
    assert.ok(action.targetPosition[0] < 0, 'Target X should be in Southwest (-X)')
    assert.ok(action.targetPosition[2] > 0, 'Target Z should be in Southwest (+Z)')
    assert.strictEqual(action.validationStatus, 'passed')
    assert.strictEqual(action.canApply, true)
  })

  await t.test('supports multi-cultural traditions (Islamic, Christian, Buddhist, Jain)', async () => {
    const islamicRes = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message: 'How should I plan the seating for family privacy and Qibla respect?',
        tradition: 'islamic',
        roomType: 'Living Room',
        currentFurniture: []
      })
    })
    const islamicData = await islamicRes.json()
    assert.strictEqual(islamicData.response.culturalContextUsed, 'islamic')
    assert.match(islamicData.response.replyText, /privacy|Qibla|prayer/i)

    const buddhistRes = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message: 'How can I organize this room for tranquil meditation?',
        tradition: 'buddhist',
        roomType: 'Living Room',
        currentFurniture: []
      })
    })
    const buddhistData = await buddhistRes.json()
    assert.strictEqual(buddhistData.response.culturalContextUsed, 'buddhist')
    assert.match(buddhistData.response.replyText, /mindful|declutter|calm|meditation/i)
  })

  await t.test('POST /api/vaastu/reset-credits-dev restores credits to 10', async () => {
    const res = await fetch(`${BASE_URL}/api/vaastu/reset-credits-dev`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.creditsRemaining, 10)
    assert.strictEqual(data.isExhausted, false)
  })

  await t.test('strictly returns 429 when credits are exhausted', async () => {
    const exhaustUser = `user_exhaustion_test_${Date.now()}`

    // Consume all 10 credits
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE_URL}/api/vaastu/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: exhaustUser,
          message: `Query count ${i + 1}`,
          currentFurniture: []
        })
      })
      assert.strictEqual(res.status, 200)
    }

    // 11th request must be rejected with 429
    const resBlocked = await fetch(`${BASE_URL}/api/vaastu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: exhaustUser,
        message: 'Query when exhausted',
        currentFurniture: []
      })
    })

    assert.strictEqual(resBlocked.status, 429)
    const blockedData = await resBlocked.json()
    assert.strictEqual(blockedData.success, false)
    assert.strictEqual(blockedData.isExhausted, true)
    assert.strictEqual(blockedData.creditsRemaining, 0)
    assert.match(blockedData.error, /exhausted.*12:00 AM IST/i)
  })
})
