import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface LuxuryEstate3DBackgroundProps {
  interactive?: boolean
  className?: string
}

export function LuxuryEstate3DBackground({
  interactive = true,
  className = ''
}: LuxuryEstate3DBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#020617')
    scene.fog = new THREE.FogExp2('#020617', 0.022)

    // 2. Camera: Serene, expansive luxury architectural perspective
    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )
    camera.position.set(12, 6.5, 14.5)

    // 3. Renderer
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.innerHTML = ''
      container.appendChild(renderer.domElement)
    } catch (e) {
      console.warn('WebGL init failed for luxury home background:', e)
      return
    }

    // 4. Orbit Controls (Static stable background, no spinning)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.minDistance = 6
    controls.maxDistance = 30
    controls.target.set(0, 1.8, 0)
    controls.autoRotate = false // Do not rotate automatically
    controls.enableZoom = false // Keep background layout stable

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfdba74, 1.4)
    sunLight.position.set(10, 8, -12)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -15
    sunLight.shadow.camera.right = 15
    sunLight.shadow.camera.top = 15
    sunLight.shadow.camera.bottom = -15
    scene.add(sunLight)

    // Warm Interior Ambient Chandelier Light
    const interiorLight = new THREE.PointLight(0xfef08a, 4.0, 16)
    interiorLight.position.set(0, 3.2, 0)
    scene.add(interiorLight)

    // Glowing Infinity Pool Light
    const poolLight = new THREE.PointLight(0x06b6d4, 3.5, 12)
    poolLight.position.set(2, 0.2, 4.5)
    scene.add(poolLight)

    // Sunken Fire Pit Light
    const firepitLight = new THREE.PointLight(0xf97316, 2.5, 6)
    firepitLight.position.set(-3.5, 0.4, 5.0)
    scene.add(firepitLight)

    // 6. BUILD LUXURY VILLA ARCHITECTURE
    const villaGroup = new THREE.Group()

    // Materials
    const concreteWallMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.7,
      metalness: 0.1
    })

    const whiteFasciaMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.3,
      metalness: 0.1
    })

    const woodSoffitMat = new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.6,
      metalness: 0.15
    })

    const glassCurtainMat = new THREE.MeshPhysicalMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.6,
      ior: 1.5
    })

    const darkFramingMat = new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.4,
      metalness: 0.8
    })

    // Ground Podium / Terrace
    const podiumGeo = new THREE.BoxGeometry(20, 0.6, 18)
    const podiumMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.8
    })
    const podium = new THREE.Mesh(podiumGeo, podiumMat)
    podium.position.set(0, -0.3, 1)
    podium.receiveShadow = true
    villaGroup.add(podium)

    // Hardwood Teak Sun Deck
    const deckGeo = new THREE.BoxGeometry(10, 0.06, 8)
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#92400e',
      roughness: 0.5
    })
    const deck = new THREE.Mesh(deckGeo, deckMat)
    deck.position.set(0, 0.03, 4.5)
    deck.receiveShadow = true
    villaGroup.add(deck)

    // Infinity Pool
    const poolBorderGeo = new THREE.BoxGeometry(7, 0.4, 4.2)
    const poolBorderMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4 })
    const poolBorder = new THREE.Mesh(poolBorderGeo, poolBorderMat)
    poolBorder.position.set(2, -0.1, 5)
    poolBorder.receiveShadow = true
    villaGroup.add(poolBorder)

    const poolWaterGeo = new THREE.PlaneGeometry(6.6, 3.8)
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      roughness: 0.05,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    })
    const poolWater = new THREE.Mesh(poolWaterGeo, poolWaterMat)
    poolWater.rotation.x = -Math.PI / 2
    poolWater.position.set(2, 0.08, 5)
    villaGroup.add(poolWater)

    // Stepping Stones Across Pool
    for (let i = -1.2; i <= 1.2; i += 1.2) {
      const stepStone = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.12, 0.8),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
      )
      stepStone.position.set(i + 2, 0.1, 5)
      stepStone.castShadow = true
      stepStone.receiveShadow = true
      villaGroup.add(stepStone)
    }

    // Sunken Lounge Pit & Fire Table
    const firePitRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
    )
    firePitRim.position.set(-3.5, 0.2, 5.0)
    firePitRim.castShadow = true
    villaGroup.add(firePitRim)

    const fireGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16),
      new THREE.MeshBasicMaterial({ color: '#f97316' })
    )
    fireGlow.position.set(-3.5, 0.38, 5.0)
    villaGroup.add(fireGlow)

    // Sunken Sofas around fire
    const sunkenSofaGeo = new THREE.BoxGeometry(2.4, 0.45, 0.8)
    const sunkenSofaMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 })
    const sofa1 = new THREE.Mesh(sunkenSofaGeo, sunkenSofaMat)
    sofa1.position.set(-3.5, 0.25, 6.4)
    villaGroup.add(sofa1)

    const sofa2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 2.0), sunkenSofaMat)
    sofa2.position.set(-4.8, 0.25, 5.3)
    villaGroup.add(sofa2)

    // ==========================================
    // GROUND FLOOR LIVING PAVILION
    // ==========================================
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.4, 0.4), concreteWallMat)
    backWall.position.set(0, 1.7, -3.2)
    backWall.castShadow = true
    backWall.receiveShadow = true
    villaGroup.add(backWall)

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 6), concreteWallMat)
    leftWall.position.set(-6, 1.7, -0.2)
    leftWall.castShadow = true
    villaGroup.add(leftWall)

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 6), concreteWallMat)
    rightWall.position.set(6, 1.7, -0.2)
    rightWall.castShadow = true
    villaGroup.add(rightWall)

    // Floor-to-ceiling glass curtain front
    const glassFront = new THREE.Mesh(new THREE.BoxGeometry(11.8, 3.2, 0.08), glassCurtainMat)
    glassFront.position.set(0, 1.6, 2.8)
    villaGroup.add(glassFront)

    // Black architectural mullions / frames
    for (let x = -4; x <= 4; x += 2.66) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 0.12), darkFramingMat)
      mullion.position.set(x, 1.7, 2.81)
      villaGroup.add(mullion)
    }

    // Modern Cantilevered Ceiling & Floor Slab
    const groundCeiling = new THREE.Mesh(new THREE.BoxGeometry(13, 0.35, 7.5), whiteFasciaMat)
    groundCeiling.position.set(0, 3.45, 0.2)
    groundCeiling.castShadow = true
    villaGroup.add(groundCeiling)

    const woodSoffit = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.06, 7.1), woodSoffitMat)
    woodSoffit.position.set(0, 3.25, 0.2)
    villaGroup.add(woodSoffit)

    // ==========================================
    // INTERIOR DESIGNER FURNITURE
    // ==========================================
    // Italian Sectional Sofa
    const sofaMain = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.75, 1.1),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 })
    )
    sofaMain.position.set(-0.8, 0.4, 0.5)
    sofaMain.castShadow = true
    villaGroup.add(sofaMain)

    const sofaL = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 1.8),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 })
    )
    sofaL.position.set(1.45, 0.4, -0.05)
    sofaL.castShadow = true
    villaGroup.add(sofaL)

    // Modern Marble Coffee Table
    const coffeeTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.35, 0.9),
      new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.2, metalness: 0.3 })
    )
    coffeeTable.position.set(-0.8, 0.2, -0.6)
    coffeeTable.castShadow = true
    villaGroup.add(coffeeTable)

    // Sculptural Gold Ring Chandelier
    const ringChandelier = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.04, 16, 64),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2, emissive: '#d97706', emissiveIntensity: 0.4 })
    )
    ringChandelier.rotation.x = Math.PI / 2
    ringChandelier.position.set(-0.8, 2.7, -0.4)
    villaGroup.add(ringChandelier)

    // Modern Abstract Art Canvas on Back Wall
    const artCanvas = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 0.05),
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        emissive: '#0369a1',
        emissiveIntensity: 0.3,
        roughness: 0.4
      })
    )
    artCanvas.position.set(-0.8, 2.0, -2.95)
    villaGroup.add(artCanvas)

    // ==========================================
    // 2ND FLOOR CANTILEVERED PENTHOUSE SUITE
    // ==========================================
    const upperSuite = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 2.8, 5.5),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 })
    )
    upperSuite.position.set(1.8, 5.0, -0.2)
    upperSuite.castShadow = true
    upperSuite.receiveShadow = true
    villaGroup.add(upperSuite)

    // Upper Floor Balcony & Glass Railing
    const upperBalcony = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.15, 1.8),
      whiteFasciaMat
    )
    upperBalcony.position.set(1.8, 3.65, 3.4)
    villaGroup.add(upperBalcony)

    const glassRailing = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.9, 0.05),
      glassCurtainMat
    )
    glassRailing.position.set(1.8, 4.15, 4.25)
    villaGroup.add(glassRailing)

    // Upper Cantilevered Flat Roof with Pergola Overhang
    const topRoof = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.3, 6.8),
      whiteFasciaMat
    )
    topRoof.position.set(1.8, 6.5, 0.3)
    topRoof.castShadow = true
    villaGroup.add(topRoof)

    // Modern Wood Louvers / Pergola Slats on Left Balcony
    for (let z = -1.5; z <= 2.5; z += 0.8) {
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 0.12, 0.12),
        woodSoffitMat
      )
      louver.position.set(-3.5, 4.8, z)
      louver.castShadow = true
      villaGroup.add(louver)
    }

    // ==========================================
    // LANDSCAPING & ESTATE ENVIRONMENT
    // ==========================================
    const lawnGeo = new THREE.PlaneGeometry(80, 80)
    const lawnMat = new THREE.MeshStandardMaterial({
      color: '#064e3b',
      roughness: 0.95,
      metalness: 0.05
    })
    const lawn = new THREE.Mesh(lawnGeo, lawnMat)
    lawn.rotation.x = -Math.PI / 2
    lawn.position.y = -0.61
    lawn.receiveShadow = true
    villaGroup.add(lawn)

    // Italian Cypress Columnar Trees
    const treeGeo = new THREE.ConeGeometry(0.7, 5.0, 12)
    const treeMat = new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.9 })

    const treePositions: [number, number, number][] = [
      [-8.5, 1.9, 2.5],
      [-9.8, 1.9, -1.0],
      [-9.2, 1.9, -4.5],
      [8.5, 1.9, 4.0],
      [9.5, 1.9, 0.5],
      [9.0, 1.9, -4.0]
    ]

    treePositions.forEach(([tx, ty, tz]) => {
      const tree = new THREE.Mesh(treeGeo, treeMat)
      tree.position.set(tx, ty, tz)
      tree.castShadow = true
      villaGroup.add(tree)

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: '#3e2723' })
      )
      trunk.position.set(tx, 0.4, tz)
      trunk.castShadow = true
      villaGroup.add(trunk)
    })

    // Ambient floating firefly particles
    const particleCount = 100
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 25
      particlePositions[i + 1] = Math.random() * 6
      particlePositions[i + 2] = (Math.random() - 0.5) * 25
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.06,
      transparent: true,
      opacity: 0.65
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    scene.add(villaGroup)

    // Animation Render Loop
    let animId: number
    let clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Flickering firepit glow
      if (firepitLight) {
        firepitLight.intensity = 2.2 + Math.sin(elapsed * 6) * 0.3
      }

      // Gentle water ripple sparkle
      if (poolWaterMat) {
        poolWaterMat.opacity = 0.85 + Math.sin(elapsed * 1.5) * 0.04
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      renderer.dispose()
      if (container) container.innerHTML = ''
    }
  }, [])

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* 3D Canvas Mounting Container */}
      <div
        ref={mountRef}
        className={`w-full h-full ${interactive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
      />
    </div>
  )
}
