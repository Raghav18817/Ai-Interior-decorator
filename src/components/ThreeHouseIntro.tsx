import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sparkles, Eye } from 'lucide-react'

interface ThreeHouseIntroProps {
  onOpenDoors?: () => void
  isDoorsOpen?: boolean
}

export function ThreeHouseIntro({ onOpenDoors, isDoorsOpen = false }: ThreeHouseIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const leftDoorRef = useRef<THREE.Mesh | null>(null)
  const rightDoorRef = useRef<THREE.Mesh | null>(null)
  const [interactiveNotice, setInteractiveNotice] = useState(true)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#030712')
    scene.fog = new THREE.FogExp2('#030712', 0.04)

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(7, 5, 8.5)

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
      console.warn('WebGL unavailable for 3D house intro:', e)
      return
    }

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 4
    controls.maxDistance = 15
    controls.target.set(0, 1.4, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6

    // 5. Lighting
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.9)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffedd5, 1.8)
    sun.position.set(6, 12, 7)
    sun.castShadow = true
    sun.shadow.mapSize.width = 1024
    sun.shadow.mapSize.height = 1024
    scene.add(sun)

    const porchLight = new THREE.PointLight(0xf59e0b, 1.8, 8)
    porchLight.position.set(0, 2.5, 2.4)
    scene.add(porchLight)

    const interiorLight = new THREE.PointLight(0x38bdf8, 1.5, 9)
    interiorLight.position.set(0, 1.6, 0)
    scene.add(interiorLight)

    // 6. Architectural Ground & Landscaping
    const groundGeo = new THREE.CircleGeometry(8, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // Stone pathway to entrance
    const pathGeo = new THREE.PlaneGeometry(1.2, 4.5)
    const pathMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.8
    })
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.rotation.x = -Math.PI / 2
    path.position.set(0, 0.01, 3.8)
    scene.add(path)

    // House Group
    const house = new THREE.Group()

    // Main House Foundation & Walls
    const mainBodyGeo = new THREE.BoxGeometry(4.2, 2.6, 3.6)
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.6,
      metalness: 0.1
    })
    const mainBody = new THREE.Mesh(mainBodyGeo, wallMat)
    mainBody.position.y = 1.3
    mainBody.castShadow = true
    mainBody.receiveShadow = true
    house.add(mainBody)

    // Second Story Balcony Extension
    const secondFloorGeo = new THREE.BoxGeometry(2.6, 1.8, 2.4)
    const secondFloorMat = new THREE.MeshStandardMaterial({
      color: '#0f766e',
      roughness: 0.4
    })
    const secondFloor = new THREE.Mesh(secondFloorGeo, secondFloorMat)
    secondFloor.position.set(0.6, 3.2, -0.4)
    secondFloor.castShadow = true
    house.add(secondFloor)

    // Gable Roof
    const roofGeo = new THREE.ConeGeometry(3.6, 1.6, 4)
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#042f2e',
      roughness: 0.5,
      metalness: 0.2
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0.6, 4.6, -0.4)
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    house.add(roof)

    // Modern Flat Canopy Over Porch
    const canopyGeo = new THREE.BoxGeometry(2.0, 0.12, 1.2)
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.4, roughness: 0.3 })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.set(0, 2.4, 2.2)
    canopy.castShadow = true
    house.add(canopy)

    // Glass Windows with Interior Warm Emissive Lighting
    const windowMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8
    })

    const winLeft = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.08), windowMat)
    winLeft.position.set(-1.3, 1.4, 1.81)
    house.add(winLeft)

    const winRight = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.08), windowMat)
    winRight.position.set(1.3, 1.4, 1.81)
    house.add(winRight)

    const winTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), windowMat)
    winTop.position.set(0.6, 3.2, 0.81)
    house.add(winTop)

    // Entrance Door Frame
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5 })
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.1, 0.1), doorFrameMat)
    doorFrame.position.set(0, 1.05, 1.82)
    house.add(doorFrame)

    // Left and Right Entrance Doors (Pivotable)
    const doorMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.95, 0.06), doorMat)
    leftDoor.position.set(-0.25, 1.02, 1.85)
    leftDoorRef.current = leftDoor
    house.add(leftDoor)

    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.95, 0.06), doorMat)
    rightDoor.position.set(0.25, 1.02, 1.85)
    rightDoorRef.current = rightDoor
    house.add(rightDoor)

    scene.add(house)

    // Raycaster for door click interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const intersects = raycaster.intersectObjects([leftDoor, rightDoor, doorFrame], false)
      if (intersects.length > 0) {
        if (onOpenDoors) onOpenDoors()
        setInteractiveNotice(false)
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)

    // 7. Render Loop
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Smooth door opening interpolation
      if (leftDoorRef.current && rightDoorRef.current) {
        const targetRot = isDoorsOpen ? Math.PI / 2.2 : 0
        leftDoorRef.current.rotation.y = THREE.MathUtils.lerp(leftDoorRef.current.rotation.y, -targetRot, 0.08)
        rightDoorRef.current.rotation.y = THREE.MathUtils.lerp(rightDoorRef.current.rotation.y, targetRot, 0.08)
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Resize
    const handleResize = () => {
      if (!container || !renderer) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [isDoorsOpen, onOpenDoors])

  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[540px]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Badge */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3.5 py-1.5 flex items-center space-x-2 text-xs text-slate-300 shadow-xl pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">DECOME 3D Interactive House</span>
      </div>

      {interactiveNotice && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center space-x-2 text-xs text-emerald-300 shadow-xl">
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click doors or drag to orbit 3D architectural model</span>
        </div>
      )}
    </div>
  )
}
