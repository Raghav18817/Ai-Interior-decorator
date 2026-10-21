import * as THREE from 'three'
import { FurnitureItem } from '../types/furniture'

/**
 * Builds realistic, photorealistic architectural 3D compound models for furniture in Three.js.
 * All groups are anchored such that their bottom aligns exactly with Y=0 (floor level).
 */
export function createFurnitureMeshGroup(item: FurnitureItem): THREE.Group {
  const group = new THREE.Group()
  group.name = `furn_group_${item.id}`

  const { width: w, height: h, depth: d, type, color } = item

  // High-Quality Designer Materials
  const primaryUpholsteryMat = new THREE.MeshStandardMaterial({
    color: color || '#475569',
    roughness: 0.75,
    metalness: 0.05
  })

  const cushionMat = new THREE.MeshStandardMaterial({
    color: color ? adjustColorBrightness(color, 1.1) : '#64748b',
    roughness: 0.8,
    metalness: 0.02
  })

  const accentPillowMat = new THREE.MeshStandardMaterial({
    color: '#0d9488', // Teal accent
    roughness: 0.85,
    metalness: 0.0
  })

  const woodOakMat = new THREE.MeshStandardMaterial({
    color: '#a16207', // Warm oak
    roughness: 0.55,
    metalness: 0.05
  })

  const darkWalnutMat = new THREE.MeshStandardMaterial({
    color: '#3e2723', // Rich walnut
    roughness: 0.5,
    metalness: 0.1
  })

  const marbleMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.18,
    metalness: 0.15
  })

  const metalLegsMat = new THREE.MeshStandardMaterial({
    color: '#0f172a', // Matte black steel
    roughness: 0.35,
    metalness: 0.8
  })

  const goldBrassMat = new THREE.MeshStandardMaterial({
    color: '#eab308', // Brushed brass
    roughness: 0.25,
    metalness: 0.85
  })

  const tvScreenMat = new THREE.MeshBasicMaterial({
    color: '#0284c7' // Ambient screen display
  })

  const leafMat = new THREE.MeshStandardMaterial({
    color: '#065f46', // Deep emerald botanical green
    roughness: 0.4,
    metalness: 0.05
  })

  // =========================================================================
  // 1. SOFAS & SECTIONALS (Multi-cushion, legs, piping, throw pillows)
  // =========================================================================
  if (type.includes('sofa') || type.includes('couch') || type.includes('sectional')) {
    const legH = 0.12
    const baseH = 0.2
    const seatH = h * 0.45
    const backH = h - seatH

    // A. Metal / Wood Legs with Brass Foot Caps
    const legRadius = 0.025
    const legPositions: [number, number][] = [
      [-w / 2 + 0.08, -d / 2 + 0.08],
      [w / 2 - 0.08, -d / 2 + 0.08],
      [-w / 2 + 0.08, d / 2 - 0.08],
      [w / 2 - 0.08, d / 2 - 0.08]
    ]

    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius, legRadius * 0.7, legH, 16),
        metalLegsMat
      )
      leg.position.set(lx, legH / 2, lz)
      leg.castShadow = true
      group.add(leg)

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius * 0.75, legRadius * 0.7, 0.03, 16),
        goldBrassMat
      )
      cap.position.set(lx, 0.015, lz)
      group.add(cap)
    })

    // B. Base Platform Frame
    const baseFrame = new THREE.Mesh(
      new THREE.BoxGeometry(w, baseH, d),
      primaryUpholsteryMat
    )
    baseFrame.position.set(0, legH + baseH / 2, 0)
    baseFrame.castShadow = true
    baseFrame.receiveShadow = true
    group.add(baseFrame)

    // C. Seat Cushions (Split into 2 or 3 distinct plush cushions)
    const cushionCount = w > 2.2 ? 3 : 2
    const cushionW = (w * 0.82) / cushionCount
    const cushionD = d * 0.72
    const cushionThick = 0.16
    const startX = -((cushionCount - 1) * cushionW) / 2

    for (let i = 0; i < cushionCount; i++) {
      const seatCushion = new THREE.Mesh(
        new THREE.BoxGeometry(cushionW - 0.02, cushionThick, cushionD),
        cushionMat
      )
      seatCushion.position.set(
        startX + i * cushionW,
        legH + baseH + cushionThick / 2,
        0.04
      )
      seatCushion.castShadow = true
      group.add(seatCushion)
    }

    // D. Ergonomic Backrest Frame & Back Cushions
    const backFrameThick = 0.16
    const backFrame = new THREE.Mesh(
      new THREE.BoxGeometry(w, backH, backFrameThick),
      primaryUpholsteryMat
    )
    backFrame.position.set(0, legH + baseH + backH / 2, -d / 2 + backFrameThick / 2)
    backFrame.castShadow = true
    group.add(backFrame)

    // Plush Back Pillows
    for (let i = 0; i < cushionCount; i++) {
      const backPillow = new THREE.Mesh(
        new THREE.BoxGeometry(cushionW - 0.04, backH * 0.8, 0.14),
        cushionMat
      )
      backPillow.rotation.x = 0.08
      backPillow.position.set(
        startX + i * cushionW,
        legH + baseH + (backH * 0.8) / 2 + 0.05,
        -d / 2 + backFrameThick + 0.06
      )
      backPillow.castShadow = true
      group.add(backPillow)
    }

    // E. Left and Right Armrests with piping profile
    const armW = w * 0.09
    const armH = backH * 0.65
    const armGeo = new THREE.BoxGeometry(armW, armH, d * 0.96)

    const leftArm = new THREE.Mesh(armGeo, primaryUpholsteryMat)
    leftArm.position.set(-w / 2 + armW / 2, legH + baseH + armH / 2 - 0.04, 0)
    leftArm.castShadow = true
    group.add(leftArm)

    const rightArm = leftArm.clone()
    rightArm.position.x = w / 2 - armW / 2
    group.add(rightArm)

    // F. Throw Pillows
    const pillowGeo = new THREE.BoxGeometry(0.35, 0.35, 0.12)
    const pillowL = new THREE.Mesh(pillowGeo, accentPillowMat)
    pillowL.rotation.set(0.1, 0.25, -0.15)
    pillowL.position.set(-w / 2 + armW + 0.16, legH + baseH + cushionThick + 0.16, -d / 4)
    pillowL.castShadow = true
    group.add(pillowL)

    const pillowR = new THREE.Mesh(pillowGeo, accentPillowMat)
    pillowR.rotation.set(0.1, -0.25, 0.15)
    pillowR.position.set(w / 2 - armW - 0.16, legH + baseH + cushionThick + 0.16, -d / 4)
    pillowR.castShadow = true
    group.add(pillowR)

  // =========================================================================
  // 2. LUXURY BEDS (Platform, Channel Tufted Headboard, Duvet, Pillows, Lamps)
  // =========================================================================
  } else if (type.includes('bed')) {
    const frameH = 0.26
    const mattressH = 0.28
    const headboardH = h * 0.75
    const headboardD = 0.14

    // Bed Platform Frame (Dark Walnut or Oak)
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w, frameH, d),
      darkWalnutMat
    )
    frame.position.set(0, frameH / 2, 0)
    frame.castShadow = true
    frame.receiveShadow = true
    group.add(frame)

    // Thick Plush Mattress
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.94, mattressH, d * 0.88),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 })
    )
    mattress.position.set(0, frameH + mattressH / 2, 0.05)
    mattress.castShadow = true
    group.add(mattress)

    // Folded Down Duvet / Quilt Layer
    const duvetH = 0.06
    const duvet = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.96, duvetH, d * 0.6),
      primaryUpholsteryMat
    )
    duvet.position.set(0, frameH + mattressH + duvetH / 2, d * 0.18)
    duvet.castShadow = true
    group.add(duvet)

    // Channel-Tufted Modern Headboard
    const headboard = new THREE.Mesh(
      new THREE.BoxGeometry(w, headboardH, headboardD),
      primaryUpholsteryMat
    )
    headboard.position.set(0, headboardH / 2, -d / 2 + headboardD / 2)
    headboard.castShadow = true
    group.add(headboard)

    // Vertical Tufting Detail Lines on Headboard
    const channelCount = 6
    for (let c = 1; c < channelCount; c++) {
      const channelLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, headboardH * 0.9, 0.02),
        metalLegsMat
      )
      channelLine.position.set(
        -w / 2 + (w / channelCount) * c,
        headboardH / 2,
        -d / 2 + headboardD + 0.01
      )
      group.add(channelLine)
    }

    // Down Sleeping Pillows (2 Rows of Pillows)
    const pillowW = w * 0.38
    const pillowD = 0.38
    const pillowH = 0.14
    const pillowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })

    const pPositions = [
      [-w * 0.23, -d / 2 + headboardD + 0.22, 0.1],
      [w * 0.23, -d / 2 + headboardD + 0.22, -0.1],
      [-w * 0.23, -d / 2 + headboardD + 0.45, 0.05],
      [w * 0.23, -d / 2 + headboardD + 0.45, -0.05]
    ]

    pPositions.forEach(([px, pz, rotZ]) => {
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(pillowW, pillowH, pillowD),
        pillowMat
      )
      pillow.rotation.set(0.18, 0, rotZ)
      pillow.position.set(px, frameH + mattressH + pillowH / 2, pz)
      pillow.castShadow = true
      group.add(pillow)
    })

    // Bedside Nightstands with Mini Table Lamps
    const standW = 0.45
    const standH = 0.45
    const standD = 0.4

    const standLeft = new THREE.Mesh(new THREE.BoxGeometry(standW, standH, standD), darkWalnutMat)
    standLeft.position.set(-w / 2 - standW / 2 - 0.05, standH / 2, -d / 2 + standD / 2)
    standLeft.castShadow = true
    group.add(standLeft)

    const standRight = standLeft.clone()
    standRight.position.x = w / 2 + standW / 2 + 0.05
    group.add(standRight)

    // Mini Warm Lamps on Nightstands
    ;[-w / 2 - standW / 2 - 0.05, w / 2 + standW / 2 + 0.05].forEach((lx) => {
      const lampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.04, 16),
        goldBrassMat
      )
      lampBase.position.set(lx, standH + 0.02, -d / 2 + standD / 2)
      group.add(lampBase)

      const lampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.13, 0.18, 16),
        new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.35 })
      )
      lampShade.position.set(lx, standH + 0.18, -d / 2 + standD / 2)
      group.add(lampShade)
    })

  // =========================================================================
  // 3. TABLES (Dining Table, Marble Coffee Table, Work Desk)
  // =========================================================================
  } else if (type.includes('table') || type.includes('desk')) {
    const isCoffeeTable = h < 0.55
    const isMarble = type.includes('coffee') || type.includes('marble')
    const topThickness = 0.04
    const topMat = isMarble ? marbleMat : woodOakMat

    // A. Sculptural Tabletop (Chamfered Bevel Profile)
    const topMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, topThickness, d),
      topMat
    )
    topMesh.position.set(0, h - topThickness / 2, 0)
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    group.add(topMesh)

    // B. Architectural Legs (Flared Mid-Century Tapered Metal Legs)
    const legH = h - topThickness
    const legRadius = isCoffeeTable ? 0.02 : 0.035

    const legOffsets: [number, number, number, number][] = [
      [-w / 2 + 0.08, -d / 2 + 0.08, -0.06, -0.06],
      [w / 2 - 0.08, -d / 2 + 0.08, 0.06, -0.06],
      [-w / 2 + 0.08, d / 2 - 0.08, -0.06, 0.06],
      [w / 2 - 0.08, d / 2 - 0.08, 0.06, 0.06]
    ]

    legOffsets.forEach(([lx, lz, rotX, rotZ]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius * 0.7, legRadius, legH, 16),
        metalLegsMat
      )
      leg.rotation.set(rotX, 0, rotZ)
      leg.position.set(lx, legH / 2, lz)
      leg.castShadow = true
      group.add(leg)

      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius * 0.8, legRadius * 0.8, 0.03, 16),
        goldBrassMat
      )
      foot.position.set(lx, 0.015, lz)
      group.add(foot)
    })

    // C. Centerpiece Decor: Ceramic Designer Vase with Foliage
    if (isCoffeeTable || w > 1.2) {
      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.09, 0.18, 16),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 })
      )
      vase.position.set(0, h + 0.09, 0)
      vase.castShadow = true
      group.add(vase)

      const plantTwig = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.22, 6),
        leafMat
      )
      plantTwig.position.set(0, h + 0.25, 0)
      group.add(plantTwig)
    }

  // =========================================================================
  // 4. CHAIRS (Lounge Armchairs, Scandinavian Dining Chairs, Office Chairs)
  // =========================================================================
  } else if (type.includes('chair') || type.includes('armchair')) {
    const isLounge = type.includes('armchair') || type.includes('lounge')
    const seatH = isLounge ? 0.4 : 0.46
    const backH = h - seatH
    const seatThick = 0.08

    // Curved Padded Seat Cushion
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.88, seatThick, d * 0.88),
      cushionMat
    )
    seat.position.set(0, seatH - seatThick / 2, 0)
    seat.castShadow = true
    group.add(seat)

    // Contoured Ergonomic Backrest
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, backH, 0.06),
      primaryUpholsteryMat
    )
    back.rotation.x = -0.1
    back.position.set(0, seatH + backH / 2 - 0.04, -d * 0.36)
    back.castShadow = true
    group.add(back)

    // Flared Legs with Cross Bracing
    const legH = seatH - seatThick
    const legPositions: [number, number, number, number][] = [
      [-w * 0.36, -d * 0.34, -0.08, -0.08],
      [w * 0.36, -d * 0.34, -0.08, 0.08],
      [-w * 0.36, d * 0.34, 0.08, -0.08],
      [w * 0.36, d * 0.34, 0.08, 0.08]
    ]

    legPositions.forEach(([lx, lz, rx, rz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, legH, 12),
        metalLegsMat
      )
      leg.rotation.set(rx, 0, rz)
      leg.position.set(lx, legH / 2, lz)
      leg.castShadow = true
      group.add(leg)
    })

  // =========================================================================
  // 5. TV CONSOLE & ENTERTAINMENT WALL (Slatted Credenza + OLED Display)
  // =========================================================================
  } else if (type.includes('tv') || type.includes('media') || type.includes('console')) {
    const credenzaH = 0.45
    const credenzaD = d * 0.9

    // A. Slatted Oak / Walnut Credenza Body
    const credenza = new THREE.Mesh(
      new THREE.BoxGeometry(w, credenzaH, credenzaD),
      darkWalnutMat
    )
    credenza.position.set(0, credenzaH / 2 + 0.08, 0)
    credenza.castShadow = true
    credenza.receiveShadow = true
    group.add(credenza)

    // Metal Base Frame
    const baseLeg1 = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.04, 0.04),
      metalLegsMat
    )
    baseLeg1.position.set(0, 0.04, credenzaD / 3)
    group.add(baseLeg1)

    const baseLeg2 = baseLeg1.clone()
    baseLeg2.position.z = -credenzaD / 3
    group.add(baseLeg2)

    // Acoustic Fabric Soundbar
    const soundbar = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.6, 0.06, 0.1),
      metalLegsMat
    )
    soundbar.position.set(0, credenzaH + 0.11, 0.08)
    soundbar.castShadow = true
    group.add(soundbar)

    // Ultra-Thin OLED TV Screen (Floating above or sitting on stand)
    const tvW = Math.min(w * 0.85, 1.5)
    const tvH = tvW * 0.58
    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(tvW, tvH, 0.03),
      metalLegsMat
    )
    tvFrame.position.set(0, credenzaH + 0.12 + tvH / 2 + 0.15, -credenzaD / 4)
    tvFrame.castShadow = true
    group.add(tvFrame)

    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(tvW * 0.98, tvH * 0.96),
      tvScreenMat
    )
    tvScreen.position.set(0, credenzaH + 0.12 + tvH / 2 + 0.15, -credenzaD / 4 + 0.016)
    group.add(tvScreen)

  // =========================================================================
  // 6. WARDROBES, CABINETS & BOOKSHELVES
  // =========================================================================
  } else if (type.includes('wardrobe') || type.includes('cabinet') || type.includes('storage') || type.includes('bookshelf')) {
    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      darkWalnutMat
    )
    mainBody.position.set(0, h / 2, 0)
    mainBody.castShadow = true
    mainBody.receiveShadow = true
    group.add(mainBody)

    // Flush Doors and Modern Vertical Brass Handle Grooves
    const handleGeo = new THREE.BoxGeometry(0.02, h * 0.35, 0.02)
    const handleL = new THREE.Mesh(handleGeo, goldBrassMat)
    handleL.position.set(-0.04, h * 0.55, d / 2 + 0.01)
    group.add(handleL)

    const handleR = handleL.clone()
    handleR.position.x = 0.04
    group.add(handleR)

  // =========================================================================
  // 7. BOTANICAL PLANTS & DECORATIVE ACCESSORIES
  // =========================================================================
  } else if (type.includes('plant') || type.includes('pot')) {
    const potH = h * 0.4
    const potRadius = Math.min(w, d) * 0.4

    // Fluted Ceramic Planter
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(potRadius, potRadius * 0.8, potH, 24),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    )
    pot.position.set(0, potH / 2, 0)
    pot.castShadow = true
    group.add(pot)

    // Soil
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(potRadius * 0.95, potRadius * 0.95, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.9 })
    )
    soil.position.set(0, potH, 0)
    group.add(soil)

    // Lush Layered Tropical Leaves
    for (let i = 0; i < 7; i++) {
      const leafAngle = (i / 7) * Math.PI * 2
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, h * 0.65, 5),
        leafMat
      )
      leaf.rotation.set(0.35 * Math.sin(leafAngle), leafAngle, 0.35 * Math.cos(leafAngle))
      leaf.position.set(
        Math.cos(leafAngle) * 0.08,
        potH + (h * 0.65) / 2 - 0.05,
        Math.sin(leafAngle) * 0.08
      )
      leaf.castShadow = true
      group.add(leaf)
    }

  // =========================================================================
  // 8. FITTED KITCHENETTE / COUNTER UNIT (Butcher Block, Shaker Cabinets, Sink)
  // =========================================================================
  } else if (type.includes('kitchen') || type.includes('counter')) {
    const kickH = 0.1
    const counterThick = 0.05
    const bodyH = h - kickH - counterThick

    // A. Recessed Toe Kick Base
    const toeKick = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.96, kickH, d * 0.88),
      metalLegsMat
    )
    toeKick.position.set(0, kickH / 2, -d * 0.04)
    group.add(toeKick)

    // B. White / Cream Shaker Cabinet Base
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: color || '#f8fafc',
      roughness: 0.45,
      metalness: 0.05
    })
    const cabinetBody = new THREE.Mesh(
      new THREE.BoxGeometry(w, bodyH, d),
      cabinetMat
    )
    cabinetBody.position.set(0, kickH + bodyH / 2, 0)
    cabinetBody.castShadow = true
    cabinetBody.receiveShadow = true
    group.add(cabinetBody)

    // Cabinet Doors & Brass Hardware
    const doorCount = Math.max(2, Math.round(w / 0.55))
    const doorW = w / doorCount
    for (let di = 0; di < doorCount; di++) {
      const dx = -w / 2 + doorW / 2 + di * doorW
      const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(doorW - 0.02, bodyH - 0.04, 0.015),
        cabinetMat
      )
      doorPanel.position.set(dx, kickH + bodyH / 2, d / 2 + 0.008)
      group.add(doorPanel)

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.12, 0.025),
        goldBrassMat
      )
      handle.position.set(dx + (di % 2 === 0 ? doorW * 0.35 : -doorW * 0.35), kickH + bodyH * 0.7, d / 2 + 0.022)
      group.add(handle)
    }

    // C. Solid Natural Wood Butcher Block Countertop
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.04, counterThick, d + 0.04),
      woodOakMat
    )
    counterTop.position.set(0, h - counterThick / 2, 0.01)
    counterTop.castShadow = true
    group.add(counterTop)

    // D. Inset Stainless Steel Sink Basin & Chrome Faucet
    const sinkGeo = new THREE.BoxGeometry(w * 0.35, 0.02, d * 0.6)
    const sinkMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 })
    const sink = new THREE.Mesh(sinkGeo, sinkMat)
    sink.position.set(-w * 0.2, h + 0.01, 0)
    group.add(sink)

    const faucet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.22, 12),
      goldBrassMat
    )
    faucet.position.set(-w * 0.2, h + 0.12, -d * 0.22)
    group.add(faucet)

  // =========================================================================
  // 9. VINTAGE RETRO REFRIGERATOR (Iconic Mint / Sage Green 1950s curves)
  // =========================================================================
  } else if (type.includes('fridge') || type.includes('refrigerator')) {
    const fridgeColor = color || '#86efac' // Mint/sage green from uploaded photo
    const fridgeMat = new THREE.MeshStandardMaterial({
      color: fridgeColor,
      roughness: 0.28,
      metalness: 0.15
    })

    const bodyH = h - 0.06
    const fridgeBody = new THREE.Mesh(
      new THREE.BoxGeometry(w, bodyH, d),
      fridgeMat
    )
    fridgeBody.position.set(0, 0.06 + bodyH / 2, 0)
    fridgeBody.castShadow = true
    fridgeBody.receiveShadow = true
    group.add(fridgeBody)

    // Chrome Base Feet
    ;[[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06], [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]].forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 12), metalLegsMat)
      foot.position.set(fx, 0.03, fz)
      group.add(foot)
    })

    // Chrome Door Divider Seam
    const seam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.015, 0.02), metalLegsMat)
    seam.position.set(0, h * 0.65, d / 2 + 0.01)
    group.add(seam)

    // Chrome Horizontal Retro Pull Handles
    const upperHandle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), goldBrassMat)
    upperHandle.position.set(w * 0.28, h * 0.72, d / 2 + 0.03)
    group.add(upperHandle)

    const lowerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), goldBrassMat)
    lowerHandle.position.set(w * 0.28, h * 0.52, d / 2 + 0.03)
    group.add(lowerHandle)

    // Chrome Brand Badge
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.01), goldBrassMat)
    badge.position.set(0, h * 0.92, d / 2 + 0.01)
    group.add(badge)

  // =========================================================================
  // 10. RUSTIC WOODEN LOFT LADDER (Angled Timber Stiles & Solid Steps)
  // =========================================================================
  } else if (type.includes('ladder')) {
    const stileW = 0.05
    const stileThick = 0.06
    const angle = 0.16 // Slightly leaned back

    // Left and Right Stiles
    ;[-w / 2 + stileW / 2, w / 2 - stileW / 2].forEach(sx => {
      const stile = new THREE.Mesh(
        new THREE.BoxGeometry(stileW, h, stileThick),
        woodOakMat
      )
      stile.rotation.x = angle
      stile.position.set(sx, h / 2, (h / 2) * Math.sin(angle))
      stile.castShadow = true
      group.add(stile)
    })

    // 7 Wooden Rungs
    const rungCount = 7
    for (let ri = 1; ri <= rungCount; ri++) {
      const ry = (h / (rungCount + 1)) * ri
      const rz = ry * Math.sin(angle)
      const rung = new THREE.Mesh(
        new THREE.BoxGeometry(w - stileW * 2, 0.04, 0.035),
        woodOakMat
      )
      rung.rotation.x = angle
      rung.position.set(0, ry, rz)
      rung.castShadow = true
      group.add(rung)
    }

  // =========================================================================
  // 11. GENERIC HIGH-END ARCHITECTURAL PIECE
  // =========================================================================
  } else {
    const beveledMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      primaryUpholsteryMat
    )
    beveledMesh.position.set(0, h / 2, 0)
    beveledMesh.castShadow = true
    beveledMesh.receiveShadow = true
    group.add(beveledMesh)
  }

  // Apply world coordinates and orientation
  group.position.set(item.position[0], item.position[1], item.position[2])
  group.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2])

  return group
}

/**
 * Helper to adjust hex color brightness for secondary cushions and textures.
 */
function adjustColorBrightness(hex: string, factor: number): string {
  try {
    const col = new THREE.Color(hex)
    col.r = Math.min(col.r * factor, 1)
    col.g = Math.min(col.g * factor, 1)
    col.b = Math.min(col.b * factor, 1)
    return `#${col.getHexString()}`
  } catch {
    return hex
  }
}
