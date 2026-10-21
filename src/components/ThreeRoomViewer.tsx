import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Room3DModel, Opening3D } from '../services/reconstructionEngine'
import { FurnitureItem } from '../types/furniture'
import { UploadedImage } from '../types/project'
import { createFurnitureMeshGroup } from '../services/furniture3DBuilder'
import { 
  checkItemLiveConstraints, 
  calculateFloorDragPosition, 
  calculateSnapToWall, 
  duplicateFurnitureItem 
} from '../services/editable3DService'
import { 
  RotateCw, 
  Eye, 
  Layers, 
  Box, 
  Compass,
  SlidersHorizontal,
  Magnet,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Move,
  RefreshCw,
  DoorOpen,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X,
  Footprints,
  Ruler,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { 
  createWoodFloorTexture, 
  createWallTexture, 
  createOutdoorBackdropTexture 
} from '../services/roomTextureService'
import { 
  buildInterconnectedRooms, 
  calculateDoorwayTransitionPath
} from '../services/multiRoomReconstruction'
import { triggerWorldLabsGeneration, pollWorldLabsOperation } from '../services/worldLabsService'
import { DimensionHonestyModal, DimensionHonestyData } from './DimensionHonestyModal'

interface ThreeRoomViewerProps {
  model: Room3DModel
  furnitureItems?: FurnitureItem[]
  onUpdateFurniture?: (items: FurnitureItem[]) => void
  images?: UploadedImage[]
  roomType?: string
  worldLabsWorldId?: string
  worldLabsViewerUrl?: string
  worldLabsAssets?: {
    colliderMeshUrl?: string
    thumbnailUrl?: string
    caption?: string
    metricScaleFactor?: number
  }
  onUpdateWorldLabsData?: (worldId: string, viewerUrl: string, assets?: any) => void
  dimensionConfirmation?: {
    confirmedByUser: boolean
    calibratedWidth?: number
    calibratedLength?: number
    calibratedHeight?: number
    notes?: string
  }
  onUpdateDimensions?: (dims: DimensionHonestyData) => void
  highlightFurnitureId?: string
}

export function ThreeRoomViewer({ 
  model, 
  furnitureItems = [], 
  onUpdateFurniture,
  images = [],
  roomType = 'Living Room',
  worldLabsWorldId: initialWorldId,
  worldLabsViewerUrl: initialViewerUrl,
  worldLabsAssets,
  onUpdateWorldLabsData,
  dimensionConfirmation,
  onUpdateDimensions,
  highlightFurnitureId
}: ThreeRoomViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null)
  const [selectedOpening, setSelectedOpening] = useState<Opening3D | null>(null)
  const [showCeiling, setShowCeiling] = useState(true)
  const [wallTransparency, setWallTransparency] = useState(1.0)
  const [cameraPreset, setCameraPreset] = useState<'orbit' | 'top' | 'eye'>('eye')
  const [showPhotoComparison, setShowPhotoComparison] = useState(false)
  const [activeViewerMode, setActiveViewerMode] = useState<'threejs' | 'worldlabs'>('threejs')
  const [worldLabsWorldId, setWorldLabsWorldId] = useState<string | null>(initialWorldId || null)
  const [worldLabsViewerUrl, setWorldLabsViewerUrl] = useState<string | null>(initialViewerUrl || null)
  const [worldLabsStatus, setWorldLabsStatus] = useState<'idle' | 'preparing' | 'generating' | 'ready' | 'error'>(
    initialViewerUrl ? 'ready' : 'idle'
  )
  const [worldLabsStatusDetail, setWorldLabsStatusDetail] = useState<string>('Ready to reconstruct 3D room from photographs')
  const [worldLabsOpId, setWorldLabsOpId] = useState<string | null>(null)
  const [worldLabsErrorMsg, setWorldLabsErrorMsg] = useState<string | null>(null)
  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState<boolean>(false)

  if (false && (worldLabsAssets || worldLabsWorldId || worldLabsOpId)) {
    console.debug(worldLabsAssets, worldLabsWorldId, worldLabsOpId)
  }

  useEffect(() => {
    if (initialWorldId) {
      setWorldLabsWorldId(initialWorldId)
    }
    if (initialViewerUrl) {
      setWorldLabsViewerUrl(initialViewerUrl)
      setWorldLabsStatus('ready')
    }
  }, [initialWorldId, initialViewerUrl])
  const cameraPresetRef = useRef(cameraPreset)
  useEffect(() => {
    cameraPresetRef.current = cameraPreset
  }, [cameraPreset])
  const [fps, setFps] = useState<number>(60)
  const [nudgeStep, setNudgeStep] = useState<number>(0.2)
  const [dragMode, setDragMode] = useState<boolean>(false)
  const [webglError, setWebglError] = useState<string | null>(null)
  const [webglRetryKey, setWebglRetryKey] = useState<number>(0)
  const [activeRoomId, setActiveRoomId] = useState<string>('room_living')

  const connectedHouse = useMemo(() => {
    return buildInterconnectedRooms(model, furnitureItems)
  }, [model, furnitureItems])

  const dragModeRef = useRef(dragMode)
  useEffect(() => {
    dragModeRef.current = dragMode
  }, [dragMode])

  // References to keep Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const ceilingMeshRef = useRef<THREE.Mesh | null>(null)
  const floorMeshRef = useRef<THREE.Mesh | null>(null)
  const walkableFloorsRef = useRef<THREE.Mesh[]>([])
  const streetViewPuckRef = useRef<THREE.Group | null>(null)
  const glideStateRef = useRef<{
    isGliding: boolean
    startTime: number
    duration: number
    startPos: THREE.Vector3
    targetPos: THREE.Vector3
    startLook: THREE.Vector3
    targetLook: THREE.Vector3
  }>({
    isGliding: false,
    startTime: 0,
    duration: 420,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    targetLook: new THREE.Vector3()
  })
  const wallMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([])
  const furnitureObjectMapRef = useRef<Map<THREE.Object3D, FurnitureItem>>(new Map())
  const openingsObjectMapRef = useRef<Map<THREE.Object3D, Opening3D>>(new Map())
  const doorsPivotMapRef = useRef<Map<string, { pivot: THREE.Group; isOpen: boolean; currentAngle: number; targetAngle: number }>>(new Map())
  const eyeLevelTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.65, 0.8))
  const clearanceHelperGroupRef = useRef<THREE.Group | null>(null)

  // Active selected furniture item
  const selectedFurniture = furnitureItems.find(f => f.id === selectedFurnitureId) || null

  // Google Street View Directional Step Navigation
  const handleStepDirection = (dir: 'forward' | 'backward' | 'left' | 'right') => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const forward = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    const stepDist = 1.2

    let moveVector = new THREE.Vector3()
    if (dir === 'forward') moveVector = forward.multiplyScalar(stepDist)
    else if (dir === 'backward') moveVector = forward.multiplyScalar(-stepDist)
    else if (dir === 'left') moveVector = right.multiplyScalar(-stepDist)
    else if (dir === 'right') moveVector = right.multiplyScalar(stepDist)

    const targetPos = camera.position.clone().add(moveVector)
    targetPos.y = 1.65

    const deltaX = targetPos.x - camera.position.x
    const deltaZ = targetPos.z - camera.position.z
    const targetLook = controls.target.clone().add(new THREE.Vector3(deltaX, 0, deltaZ))

    glideStateRef.current = {
      isGliding: true,
      startTime: performance.now(),
      duration: 380,
      startPos: camera.position.clone(),
      targetPos,
      startLook: controls.target.clone(),
      targetLook
    }
  }

  // Google Street View Head Turn Navigation
  const handleTurnHeading = (angle: number) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const offset = new THREE.Vector3().subVectors(controls.target, camera.position)
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
    controls.target.copy(camera.position).add(offset)
    controls.update()
  }

  const handleSwitchRoom = (roomId: string) => {
    setActiveRoomId(roomId)
    const targetRoom = connectedHouse.rooms.find(r => r.id === roomId)
    if (!targetRoom || !controlsRef.current || !cameraRef.current) return

    const { targetLookAt, targetCameraPos } = calculateDoorwayTransitionPath(targetRoom)

    glideStateRef.current = {
      isGliding: true,
      startTime: performance.now(),
      duration: 550,
      startPos: cameraRef.current.position.clone(),
      targetPos: new THREE.Vector3(...targetCameraPos),
      startLook: controlsRef.current.target.clone(),
      targetLook: new THREE.Vector3(...targetLookAt)
    }
  }

  // World Labs AI Trigger & Polling Handler
  const handleTriggerWorldLabs = async () => {
    const readyImages = images.filter(img => img.status === 'ready')
    const readyImg = readyImages[0] || images[0]
    if (!readyImg) {
      alert('Please upload room photographs first to reconstruct a 3D model.')
      return
    }

    try {
      setWorldLabsStatus('preparing')
      setWorldLabsStatusDetail(`Validating ${readyImages.length || 1} photographs and preparing upload staging...`)
      setWorldLabsErrorMsg(null)

      const result = await triggerWorldLabsGeneration(
        readyImages.length > 0 ? readyImages : [readyImg],
        {
          textPrompt: `A photorealistic architectural ${roomType || 'room'} interior reconstruction with natural lighting, accurate wall boundaries, and interior furnishings`,
          displayName: `InteriorAI ${roomType || 'Room'} Reconstruction`,
          roomType: roomType
        }
      )

      setWorldLabsOpId(result.operationId)
      setWorldLabsStatus('generating')
      setWorldLabsStatusDetail('Reconstructing 3D room model on World Labs Marble AI...')
      if (result.worldId) {
        setWorldLabsWorldId(result.worldId)
      }
      if (result.viewerUrl) {
        setWorldLabsViewerUrl(result.viewerUrl)
        if (onUpdateWorldLabsData && result.worldId) {
          onUpdateWorldLabsData(result.worldId, result.viewerUrl)
        }
      }

      // Poll until finished
      const pollInterval = window.setInterval(async () => {
        try {
          const status = await pollWorldLabsOperation(result.operationId)
          if (status.description) {
            setWorldLabsStatusDetail(status.description)
          }
          if (status.done) {
            window.clearInterval(pollInterval)
            setWorldLabsStatus('ready')
            setWorldLabsStatusDetail('3D room model reconstructed successfully!')
            if (status.worldId) {
              setWorldLabsWorldId(status.worldId)
              const viewerUrl = status.viewerUrl || `https://marble.worldlabs.ai/world/${status.worldId}`
              setWorldLabsViewerUrl(viewerUrl)
              if (onUpdateWorldLabsData) {
                onUpdateWorldLabsData(status.worldId, viewerUrl, {
                  colliderMeshUrl: status.meshUrl,
                  thumbnailUrl: status.thumbnailUrl,
                  caption: status.caption,
                  metricScaleFactor: status.semantics?.metric_scale_factor
                })
              }
            }
          }
        } catch (pollErr: any) {
          console.warn('Polling status check:', pollErr.message)
        }
      }, 5000)
    } catch (err: any) {
      console.error('Trigger World Labs failed:', err)
      setWorldLabsStatus('error')
      setWorldLabsErrorMsg(err.message || '3D reconstruction failed. Please verify your connection and try again.')
    }
  }

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // 1. Initialize Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#090d16')
    sceneRef.current = scene

    // 2. Camera Setup (Defaults directly to 1.65m Street View inside the room)
    const aspect = container.clientWidth / (container.clientHeight || 1)
    const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100)
    camera.position.set(0, 1.65, model.dimensions.width * 0.25)
    cameraRef.current = camera

    // 3. WebGL Renderer with graceful crash fallback
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      rendererRef.current = renderer
      container.innerHTML = ''
      container.appendChild(renderer.domElement)
      setWebglError(null)
    } catch (err) {
      console.warn('WebGL initialization failed, switching to 2D architectural schematic mode:', err)
      setWebglError(err instanceof Error ? err.message : 'WebGL hardware acceleration is unavailable')
      return
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault()
      console.warn('WebGL context lost event triggered')
      setWebglError('WebGL graphics context was reclaimed by the operating system or GPU memory pressure.')
    }

    const handleContextRestored = () => {
      console.info('WebGL context restored')
      setWebglRetryKey(k => k + 1)
      setWebglError(null)
    }

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored)

    // 4. Orbit Controls (Configured for effortless 360-degree Street View head turning)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.5
    controls.maxDistance = 50.0
    controls.minPolarAngle = 0.05
    controls.maxPolarAngle = Math.PI - 0.05
    controls.target.set(0, 1.55, -model.dimensions.width * 0.35)
    controlsRef.current = controls

    // 5. Lighting (Warm interior sunlight & cozy downlight atmosphere)
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.9)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfef08a, 1.25)
    sunLight.position.set(3, 6, 4)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 1024
    sunLight.shadow.mapSize.height = 1024
    scene.add(sunLight)

    const interiorWarmLight = new THREE.PointLight(0xfde047, 0.75, 12)
    interiorWarmLight.position.set(0, model.ceiling.height - 0.3, 0)
    scene.add(interiorWarmLight)

    // 6. Photorealistic Hardwood Floor Mesh (Natural Oak Planks)
    const woodTexture = createWoodFloorTexture()
    const floorGeo = new THREE.PlaneGeometry(model.floor.width, model.floor.length)
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.45,
      metalness: 0.05
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.receiveShadow = true
    scene.add(floorMesh)
    floorMeshRef.current = floorMesh
    walkableFloorsRef.current = [floorMesh]

    // 7. Ceiling Mesh & Exposed Rustic Timber Roof Rafters / Beams
    const ceilingGeo = new THREE.PlaneGeometry(model.ceiling.width, model.ceiling.length)
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xfefce8,
      roughness: 0.85,
      side: THREE.DoubleSide
    })
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat)
    ceilingMesh.position.y = model.ceiling.height
    ceilingMesh.rotation.x = Math.PI / 2
    ceilingMesh.visible = showCeiling
    ceilingMeshRef.current = ceilingMesh
    scene.add(ceilingMesh)

    // Exposed Rustic Timber Beams / Rafters across ceiling (matching uploaded cottage photo)
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Warm rich oak
      roughness: 0.65,
      metalness: 0.05
    })
    const beamCount = Math.max(5, Math.round(model.dimensions.length / 0.85))
    const beamSpacing = model.dimensions.length / (beamCount + 1)
    for (let b = 1; b <= beamCount; b++) {
      const bx = -model.dimensions.length / 2 + b * beamSpacing
      const beamGeo = new THREE.BoxGeometry(0.12, 0.16, model.floor.width)
      const beamMesh = new THREE.Mesh(beamGeo, beamMat)
      beamMesh.position.set(bx, model.ceiling.height - 0.08, 0)
      beamMesh.castShadow = true
      beamMesh.receiveShadow = true
      scene.add(beamMesh)
    }

    // Longitudinal Ridge Beam along ceiling center
    const ridgeGeo = new THREE.BoxGeometry(model.floor.length, 0.14, 0.14)
    const ridgeMesh = new THREE.Mesh(ridgeGeo, beamMat)
    ridgeMesh.position.set(0, model.ceiling.height - 0.07, 0)
    scene.add(ridgeMesh)

    // Loft Mezzanine Platform at rear ceiling height (matching uploaded cabin photo)
    const loftDepth = Math.min(1.4, model.dimensions.width * 0.35)
    const loftPlatformGeo = new THREE.BoxGeometry(model.floor.length, 0.12, loftDepth)
    const loftPlatform = new THREE.Mesh(loftPlatformGeo, beamMat)
    loftPlatform.position.set(0, model.ceiling.height * 0.65, -model.floor.width / 2 + loftDepth / 2)
    loftPlatform.receiveShadow = true
    loftPlatform.castShadow = true
    scene.add(loftPlatform)

    // Loft Front Safety Railing
    const handrailGeo = new THREE.BoxGeometry(model.floor.length, 0.06, 0.06)
    const handrail = new THREE.Mesh(handrailGeo, beamMat)
    handrail.position.set(0, model.ceiling.height * 0.65 + 0.75, -model.floor.width / 2 + loftDepth)
    scene.add(handrail)

    const spindleCount = Math.round(model.floor.length / 0.35)
    for (let s = 0; s <= spindleCount; s++) {
      const sx = -model.floor.length / 2 + (model.floor.length / spindleCount) * s
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), beamMat)
      spindle.position.set(sx, model.ceiling.height * 0.65 + 0.35, -model.floor.width / 2 + loftDepth)
      scene.add(spindle)
    }

    // 8. Solid Interior Architectural Walls & Baseboards (Opaque, Plaster finish)
    wallMaterialsRef.current = []
    model.walls.forEach((w) => {
      const wallGeo = new THREE.BoxGeometry(w.width, w.height, w.depth)
      const wallMat = new THREE.MeshStandardMaterial({
        map: createWallTexture(w.color || '#f8fafc'),
        roughness: 0.85,
        transparent: wallTransparency < 1.0,
        opacity: wallTransparency
      })
      wallMaterialsRef.current.push(wallMat)

      const wallMesh = new THREE.Mesh(wallGeo, wallMat)
      wallMesh.position.set(...w.position)
      wallMesh.rotation.set(...w.rotation)
      wallMesh.receiveShadow = true
      scene.add(wallMesh)

      // Baseboard Trim Moldings along bottom perimeter
      const baseboardGeo = new THREE.BoxGeometry(w.width, 0.12, w.depth + 0.04)
      const baseboardMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 })
      const baseboard = new THREE.Mesh(baseboardGeo, baseboardMat)
      baseboard.position.set(w.position[0], 0.06, w.position[2])
      baseboard.rotation.set(...w.rotation)
      scene.add(baseboard)
    })

    // 9. Openings (Interactive Doors & Framed Windows with Outdoor Vista)
    openingsObjectMapRef.current.clear()
    doorsPivotMapRef.current.clear()
    const combinedOpenings = [...model.openings, ...connectedHouse.allOpenings]
    combinedOpenings.forEach((op) => {
      const isDoor = op.type === 'door'

      if (isDoor) {
        const doorUnit = new THREE.Group()
        doorUnit.position.set(...op.position)
        doorUnit.rotation.set(...op.rotation)

        // Door Frame
        const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(op.width + 0.1, 0.08, op.depth + 0.04), frameMat)
        topFrame.position.set(0, op.height / 2 - 0.04, 0)
        doorUnit.add(topFrame)

        // Hinge Pivot at side of door
        const hingePivot = new THREE.Group()
        hingePivot.position.set(-op.width / 2, 0, 0)

        const doorPanelMat = new THREE.MeshStandardMaterial({
          color: '#78350f',
          roughness: 0.6,
          metalness: 0.1
        })
        const doorPanel = new THREE.Mesh(
          new THREE.BoxGeometry(op.width * 0.96, op.height * 0.94, 0.05),
          doorPanelMat
        )
        doorPanel.position.set(op.width * 0.48, 0, 0)
        doorPanel.castShadow = true
        hingePivot.add(doorPanel)

        // Brass Lever Handle
        const brassMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.25 })
        const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.06), brassMat)
        handleLever.position.set(op.width * 0.88, 0, 0.04)
        hingePivot.add(handleLever)

        doorUnit.add(hingePivot)
        scene.add(doorUnit)

        openingsObjectMapRef.current.set(doorPanel, op)
        doorsPivotMapRef.current.set(op.id, {
          pivot: hingePivot,
          isOpen: false,
          currentAngle: 0,
          targetAngle: 0
        })
      } else {
        // Window with Frame, Mullions, and Flush Outdoor Vista
        const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(op.width, op.height, 0.06), frameMat)
        frameMesh.position.set(...op.position)
        frameMesh.rotation.set(...op.rotation)
        scene.add(frameMesh)

        // Transparent Glass Pane
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          roughness: 0.1,
          transparent: true,
          opacity: 0.35
        })
        const glassMesh = new THREE.Mesh(new THREE.PlaneGeometry(op.width * 0.94, op.height * 0.94), glassMat)
        glassMesh.position.set(...op.position)
        glassMesh.rotation.set(...op.rotation)
        scene.add(glassMesh)
        openingsObjectMapRef.current.set(glassMesh, op)

        // Vertical and Horizontal Mullion Divider Bars
        const vertMullion = new THREE.Mesh(new THREE.BoxGeometry(0.025, op.height * 0.92, 0.02), frameMat)
        vertMullion.position.set(op.position[0], op.position[1], op.position[2])
        vertMullion.rotation.set(...op.rotation)
        scene.add(vertMullion)

        const horizMullion = new THREE.Mesh(new THREE.BoxGeometry(op.width * 0.92, 0.025, 0.02), frameMat)
        horizMullion.position.set(op.position[0], op.position[1], op.position[2])
        horizMullion.rotation.set(...op.rotation)
        scene.add(horizMullion)

        // Outdoor Landscape Backdrop (Placed flush 0.08m behind window exterior)
        const normOffset = 0.08
        const nx = op.position[0] > 0 ? normOffset : op.position[0] < 0 ? -normOffset : 0
        const nz = op.position[2] > 0 ? normOffset : op.position[2] < 0 ? -normOffset : 0
        const vistaMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(op.width * 1.6, op.height * 1.5),
          new THREE.MeshBasicMaterial({
            map: createOutdoorBackdropTexture(),
            side: THREE.DoubleSide
          })
        )
        vistaMesh.position.set(op.position[0] + nx, op.position[1], op.position[2] + nz)
        vistaMesh.rotation.set(...op.rotation)
        scene.add(vistaMesh)
      }
    })

    // 10. Connected Adjacent Rooms (Master Bedroom & Kitchen Walkthrough)
    connectedHouse.rooms.forEach((room) => {
      if (room.id === 'room_living') return

      const [rx, ry, rz] = room.centerOffset
      const rL = room.dimensions.length
      const rW = room.dimensions.width
      const rH = room.dimensions.height

      const adjFloorGeo = new THREE.PlaneGeometry(rL, rW)
      const adjFloorMat = new THREE.MeshStandardMaterial({
        map: createWoodFloorTexture(),
        roughness: 0.5,
        metalness: 0.05
      })
      const adjFloorMesh = new THREE.Mesh(adjFloorGeo, adjFloorMat)
      adjFloorMesh.position.set(rx, ry, rz)
      adjFloorMesh.rotation.x = -Math.PI / 2
      adjFloorMesh.receiveShadow = true
      scene.add(adjFloorMesh)
      walkableFloorsRef.current.push(adjFloorMesh)

      const halfRL = rL / 2
      const halfRW = rW / 2
      const halfRH = rH / 2

      const adjWalls = [
        { pos: [rx, halfRH, rz - halfRW], size: [rL, rH, 0.15], rot: [0, 0, 0] },
        { pos: [rx, halfRH, rz + halfRW], size: [rL, rH, 0.15], rot: [0, 0, 0] },
        { pos: [rx > 0 ? rx + halfRL : rx - halfRL, halfRH, rz], size: [rW, rH, 0.15], rot: [0, Math.PI / 2, 0] }
      ]

      adjWalls.forEach(aw => {
        const awMat = new THREE.MeshStandardMaterial({
          map: createWallTexture('#e2e8f0'),
          roughness: 0.85,
          transparent: wallTransparency < 1.0,
          opacity: wallTransparency
        })
        const awMesh = new THREE.Mesh(new THREE.BoxGeometry(aw.size[0], aw.size[1], aw.size[2]), awMat)
        awMesh.position.set(aw.pos[0], aw.pos[1], aw.pos[2])
        awMesh.rotation.set(aw.rot[0], aw.rot[1], aw.rot[2])
        awMesh.receiveShadow = true
        scene.add(awMesh)
      })

      room.furniture.forEach((adjFurn) => {
        const adjGroup = createFurnitureMeshGroup(adjFurn)
        scene.add(adjGroup)
        adjGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            furnitureObjectMapRef.current.set(child, adjFurn)
          }
        })
      })
    })

    // 10b. Google Maps Street View Floor Hover Ring & Forward Chevron Puck
    const puck = new THREE.Group()
    puck.name = 'street_view_puck'

    const ringGeo = new THREE.RingGeometry(0.24, 0.34, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = -Math.PI / 2
    puck.add(ringMesh)

    const discGeo = new THREE.CircleGeometry(0.22, 32)
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    })
    const discMesh = new THREE.Mesh(discGeo, discMat)
    discMesh.rotation.x = -Math.PI / 2
    puck.add(discMesh)

    const arrowShape = new THREE.Shape()
    arrowShape.moveTo(0, 0.16)
    arrowShape.lineTo(0.12, -0.08)
    arrowShape.lineTo(0.04, -0.04)
    arrowShape.lineTo(0.04, -0.14)
    arrowShape.lineTo(-0.04, -0.14)
    arrowShape.lineTo(-0.04, -0.04)
    arrowShape.lineTo(-0.12, -0.08)
    arrowShape.closePath()

    const arrowMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(arrowShape),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    )
    arrowMesh.rotation.x = -Math.PI / 2
    arrowMesh.position.y = 0.002
    puck.add(arrowMesh)

    puck.position.y = 0.015
    puck.visible = false
    scene.add(puck)
    streetViewPuckRef.current = puck

    // 11. Furniture Rendering using compound mesh builder
    furnitureObjectMapRef.current.clear()
    furnitureItems.forEach((item) => {
      const itemGroup = createFurnitureMeshGroup(item)
      scene.add(itemGroup)

      if (highlightFurnitureId && item.id === highlightFurnitureId) {
        const boxHelper = new THREE.BoxHelper(itemGroup, 0x10b981)
        scene.add(boxHelper)
      }

      // Traverse children so raycaster can identify any child mesh belonging to this furniture
      itemGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          furnitureObjectMapRef.current.set(child, item)
        }
      })
    })

    // 12. Clearance Visualization helper group
    const clearanceGroup = new THREE.Group()
    clearanceHelperGroupRef.current = clearanceGroup
    scene.add(clearanceGroup)

    // 13. Raycasting for object selection, Google Street View Walkthrough & Doorways
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // 1. Check furniture first
      const furnitureMeshes = Array.from(furnitureObjectMapRef.current.keys())
      const furnIntersects = raycaster.intersectObjects(furnitureMeshes, false)

      if (furnIntersects.length > 0) {
        const hit = furnitureObjectMapRef.current.get(furnIntersects[0].object)
        if (hit) {
          setSelectedFurnitureId(hit.id)
          setSelectedOpening(null)
          return
        }
      }

      // 2. Check openings (Doors and Windows)
      const openingMeshes = Array.from(openingsObjectMapRef.current.keys())
      const openIntersects = raycaster.intersectObjects(openingMeshes, false)

      if (openIntersects.length > 0) {
        const hit = openingsObjectMapRef.current.get(openIntersects[0].object)
        if (hit) {
          setSelectedOpening(hit)
          setSelectedFurnitureId(null)

          if (hit.type === 'door') {
            const doorState = doorsPivotMapRef.current.get(hit.id)
            if (doorState) {
              doorState.isOpen = !doorState.isOpen
              doorState.targetAngle = doorState.isOpen ? Math.PI / 2.2 : 0
            }
          }
          return
        }
      }

      // 3. Google Maps Street View: Click anywhere on floor to glide forward
      if (walkableFloorsRef.current.length > 0) {
        const floorIntersects = raycaster.intersectObjects(walkableFloorsRef.current)
        if (floorIntersects.length > 0) {
          const hitPt = floorIntersects[0].point
          const startPos = camera.position.clone()
          const targetPos = new THREE.Vector3(hitPt.x, 1.65, hitPt.z)
          const deltaX = targetPos.x - startPos.x
          const deltaZ = targetPos.z - startPos.z
          const startLook = controls.target.clone()
          const targetLook = new THREE.Vector3(startLook.x + deltaX, startLook.y, startLook.z + deltaZ)

          glideStateRef.current = {
            isGliding: true,
            startTime: performance.now(),
            duration: 420,
            startPos,
            targetPos,
            startLook,
            targetLook
          }
          return
        }
      }

      // Clicked outside: clear selection
      setSelectedFurnitureId(null)
      setSelectedOpening(null)
    }

    // 14. Interactive 2D Floor Plane Drag Interaction & Street View Hover Puck Tracking
    let isDragging = false
    let draggedItem: FurnitureItem | null = null

    const handlePointerDown = (e: PointerEvent) => {
      if (!dragModeRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const furnitureMeshes = Array.from(furnitureObjectMapRef.current.keys())
      const furnIntersects = raycaster.intersectObjects(furnitureMeshes, false)
      if (furnIntersects.length > 0) {
        const hit = furnitureObjectMapRef.current.get(furnIntersects[0].object)
        if (hit) {
          isDragging = true
          draggedItem = hit
          setSelectedFurnitureId(hit.id)
          controls.enabled = false
        }
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      if (isDragging && draggedItem && floorMeshRef.current && onUpdateFurniture) {
        const floorIntersects = raycaster.intersectObject(floorMeshRef.current)
        if (floorIntersects.length > 0) {
          const pt = floorIntersects[0].point
          const newCoords = calculateFloorDragPosition(
            { x: pt.x, z: pt.z },
            draggedItem,
            { length: model.dimensions.length, width: model.dimensions.width }
          )
          const newItems = furnitureItems.map(f => {
            if (f.id === draggedItem!.id) {
              return { ...f, position: newCoords }
            }
            return f
          })
          onUpdateFurniture(newItems)
        }
        return
      }

      // Update Google Maps Street View hover ring on floor
      if (walkableFloorsRef.current.length > 0 && streetViewPuckRef.current) {
        const floorHits = raycaster.intersectObjects(walkableFloorsRef.current)
        if (floorHits.length > 0) {
          const hitPt = floorHits[0].point
          streetViewPuckRef.current.visible = true
          streetViewPuckRef.current.position.set(hitPt.x, 0.015, hitPt.z)
          const dx = hitPt.x - camera.position.x
          const dz = hitPt.z - camera.position.z
          streetViewPuckRef.current.rotation.z = -Math.atan2(dx, dz)
        } else {
          streetViewPuckRef.current.visible = false
        }
      }
    }

    const handlePointerUp = () => {
      if (isDragging) {
        isDragging = false
        draggedItem = null
        controls.enabled = true
      }
    }

    renderer.domElement.addEventListener('click', handleClick)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    // 15. Render Loop & Google Street View Smooth Glide
    let animationFrameId: number
    let lastTime = performance.now()
    let frameCount = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      // Smoothly animate swinging doors
      doorsPivotMapRef.current.forEach((doorState) => {
        doorState.currentAngle = THREE.MathUtils.lerp(doorState.currentAngle, doorState.targetAngle, 0.1)
        doorState.pivot.rotation.y = doorState.currentAngle
      })

      // Street View Click-to-Walk Gliding with smooth easing
      if (glideStateRef.current.isGliding) {
        const elapsed = performance.now() - glideStateRef.current.startTime
        const t = Math.min(1, elapsed / glideStateRef.current.duration)
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        camera.position.lerpVectors(glideStateRef.current.startPos, glideStateRef.current.targetPos, ease)
        controls.target.lerpVectors(glideStateRef.current.startLook, glideStateRef.current.targetLook, ease)
        if (t >= 1) {
          glideStateRef.current.isGliding = false
        }
      }

      // Gentle pulsating effect for Street View floor puck
      if (streetViewPuckRef.current && streetViewPuckRef.current.visible) {
        const pulse = 1 + 0.05 * Math.sin(performance.now() * 0.006)
        streetViewPuckRef.current.scale.set(pulse, pulse, pulse)
      }

      controls.update()
      renderer.render(scene, camera)

      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frameCount)
        frameCount = 0
        lastTime = now
      }
    }
    animate()

    // 16. Responsive Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })
    resizeObserver.observe(container)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored)
      window.removeEventListener('pointerup', handlePointerUp)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [model, furnitureItems, onUpdateFurniture, webglRetryKey, highlightFurnitureId])

  // Update ceiling visibility
  useEffect(() => {
    if (ceilingMeshRef.current) {
      ceilingMeshRef.current.visible = showCeiling
    }
  }, [showCeiling])

  // Update wall transparency
  useEffect(() => {
    wallMaterialsRef.current.forEach((mat) => {
      mat.opacity = wallTransparency
    })
  }, [wallTransparency])

  // Live spatial constraint feedback for selected piece
  const liveStatus = useMemo(() => {
    if (!selectedFurniture) return null
    return checkItemLiveConstraints(
      selectedFurniture,
      furnitureItems,
      { length: model.dimensions.length, width: model.dimensions.width },
      model.openings
    )
  }, [selectedFurniture, furnitureItems, model.dimensions, model.openings])

  // Draw clearance zone for selected furniture with dynamic violation color feedback
  useEffect(() => {
    const group = clearanceHelperGroupRef.current
    if (!group) return
    group.clear()

    if (!selectedFurniture) return

    const { width: w, depth: d, position, rotation, clearanceRequired } = selectedFurniture
    const { frontMeters } = clearanceRequired

    const isViolating = liveStatus && !liveStatus.isValid
    const clearColor = isViolating ? 0xf43f5e : 0x10b981

    // Plane representing front clearance walking buffer
    const clearGeo = new THREE.PlaneGeometry(w, frontMeters)
    const clearMat = new THREE.MeshBasicMaterial({
      color: clearColor,
      transparent: true,
      opacity: isViolating ? 0.45 : 0.25,
      side: THREE.DoubleSide
    })
    const clearMesh = new THREE.Mesh(clearGeo, clearMat)
    clearMesh.rotation.x = -Math.PI / 2
    clearMesh.position.set(0, 0.02, d / 2 + frontMeters / 2)

    const clearGroup = new THREE.Group()
    clearGroup.add(clearMesh)
    clearGroup.position.set(position[0], 0, position[2])
    clearGroup.rotation.y = rotation[1]
    group.add(clearGroup)
  }, [selectedFurniture, liveStatus])

  // Camera Presets
  const setCameraView = (view: 'orbit' | 'top' | 'eye') => {
    setCameraPreset(view)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { length, width, height } = model.dimensions

    if (view === 'orbit') {
      camera.position.set(length * 1.3, height * 1.6, width * 1.5)
      controls.target.set(0, height / 3, 0)
    } else if (view === 'top') {
      camera.position.set(0, Math.max(length, width) * 2.0, 0)
      controls.target.set(0, 0, 0)
    } else if (view === 'eye') {
      eyeLevelTargetPosRef.current.set(0, 1.65, model.dimensions.width * 0.3)
      camera.position.set(0, 1.65, model.dimensions.width * 0.3)
      controls.target.set(0, 1.55, -model.dimensions.width * 0.3)
    }
    controls.update()
  }

  // Adjust selected furniture position
  const handleMovePosition = (axis: 'x' | 'z', delta: number) => {
    if (!selectedFurniture || !onUpdateFurniture) return

    const halfL = model.dimensions.length / 2 - selectedFurniture.width / 2
    const halfW = model.dimensions.width / 2 - selectedFurniture.depth / 2

    const newItems = furnitureItems.map((item) => {
      if (item.id === selectedFurniture.id) {
        const newPos: [number, number, number] = [...item.position]
        if (axis === 'x') {
          newPos[0] = Math.max(-halfL, Math.min(halfL, Number((newPos[0] + delta).toFixed(2))))
        } else {
          newPos[2] = Math.max(-halfW, Math.min(halfW, Number((newPos[2] + delta).toFixed(2))))
        }
        return { ...item, position: newPos }
      }
      return item
    })

    onUpdateFurniture(newItems)
  }

  // Rotate selected furniture by 90 degrees
  const handleRotate = () => {
    if (!selectedFurniture || !onUpdateFurniture) return

    const newItems = furnitureItems.map((item) => {
      if (item.id === selectedFurniture.id) {
        const nextRotY = (item.rotation[1] + Math.PI / 2) % (Math.PI * 2)
        return {
          ...item,
          rotation: [item.rotation[0], Number(nextRotY.toFixed(4)), item.rotation[2]] as [number, number, number]
        }
      }
      return item
    })

    onUpdateFurniture(newItems)
  }

  // Snap selected furniture flush against nearest perimeter wall
  const handleSnapToWall = () => {
    if (!selectedFurniture || !onUpdateFurniture) return
    const snapped = calculateSnapToWall(selectedFurniture, {
      length: model.dimensions.length,
      width: model.dimensions.width
    })
    const newItems = furnitureItems.map(item => {
      if (item.id === selectedFurniture.id) {
        return {
          ...item,
          position: snapped.position,
          rotation: snapped.rotation
        }
      }
      return item
    })
    onUpdateFurniture(newItems)
  }

  // Duplicate selected furniture
  const handleDuplicate = () => {
    if (!selectedFurniture || !onUpdateFurniture) return
    const dup = duplicateFurnitureItem(selectedFurniture, {
      length: model.dimensions.length,
      width: model.dimensions.width
    })
    onUpdateFurniture([...furnitureItems, dup])
    setSelectedFurnitureId(dup.id)
  }

  // Delete selected furniture
  const handleDelete = () => {
    if (!selectedFurniture || !onUpdateFurniture) return
    const newItems = furnitureItems.filter(item => item.id !== selectedFurniture.id)
    onUpdateFurniture(newItems)
    setSelectedFurnitureId(null)
  }

  // Adjust elevation / height (Y axis) for wall mounts or consoles
  const handleElevateY = (delta: number) => {
    if (!selectedFurniture || !onUpdateFurniture) return
    const newItems = furnitureItems.map(item => {
      if (item.id === selectedFurniture.id) {
        const newY = Math.max(0, Math.min(model.dimensions.height - item.height, Number((item.position[1] + delta).toFixed(2))))
        return {
          ...item,
          position: [item.position[0], newY, item.position[2]] as [number, number, number]
        }
      }
      return item
    })
    onUpdateFurniture(newItems)
  }

  return (
    <div className="space-y-4">
      {/* Connected Multi-Room Walkthrough Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-2">
          <DoorOpen className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Connected Rooms:</span>
        </div>

        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {connectedHouse.rooms.map((room) => {
            const isActive = room.id === activeRoomId
            return (
              <button
                key={room.id}
                onClick={() => handleSwitchRoom(room.id)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{room.name}</span>
                {isActive && <Sparkles className="w-3 h-3 text-slate-950" />}
              </button>
            )
          })}
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:block">
          Click any doorway portal or room tab to walk through
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        {webglError ? (
          <div className="w-full h-full flex flex-col items-center justify-between p-6 bg-slate-950/95">
            {/* Fallback Banner */}
            <div className="max-w-xl w-full bg-slate-900 border border-amber-500/40 rounded-xl p-4 text-center shadow-xl space-y-2">
              <div className="flex items-center justify-center space-x-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  2D Architectural Schematic Mode (Hardware Fallback)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {webglError}
              </p>
              <button
                onClick={() => {
                  setWebglError(null)
                  setWebglRetryKey(k => k + 1)
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore 3D View</span>
              </button>
            </div>

            {/* 2D Floorplan Plan SVG */}
            <div className="w-full flex-1 flex items-center justify-center p-2 min-h-0">
              <svg viewBox="0 0 600 360" className="w-full h-full max-h-[340px] select-none">
                {(() => {
                  const roomL = model.dimensions.length
                  const roomW = model.dimensions.width
                  const scale = Math.min(480 / roomL, 280 / roomW)
                  const pxL = roomL * scale
                  const pxW = roomW * scale
                  const ox = (600 - pxL) / 2
                  const oy = (360 - pxW) / 2

                  return (
                    <g>
                      {/* Architectural perimeter floor */}
                      <rect
                        x={ox}
                        y={oy}
                        width={pxL}
                        height={pxW}
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="3"
                        rx="4"
                      />
                      {/* Perimeter dimension text */}
                      <text x={ox + pxL / 2} y={oy - 8} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                        {roomL.toFixed(1)}m (Length)
                      </text>
                      <text
                        x={ox - 10}
                        y={oy + pxW / 2}
                        fill="#94a3b8"
                        fontSize="11"
                        textAnchor="middle"
                        transform={`rotate(-90 ${ox - 10} ${oy + pxW / 2})`}
                        fontWeight="bold"
                      >
                        {roomW.toFixed(1)}m (Width)
                      </text>

                      {/* Openings: Doors (Amber) and Windows (Cyan) */}
                      {model.openings.map(op => {
                        const isDoor = op.type === 'door'
                        const opX = ox + (op.position[0] + roomL / 2) * scale
                        const opY = oy + (op.position[2] + roomW / 2) * scale
                        return (
                          <g key={op.id}>
                            <circle
                              cx={opX}
                              cy={opY}
                              r="7"
                              fill={isDoor ? '#f59e0b' : '#38bdf8'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={opX}
                              y={opY + (op.position[2] > 0 ? 16 : -10)}
                              fill={isDoor ? '#fbbf24' : '#7dd3fc'}
                              fontSize="9"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {op.label}
                            </text>
                          </g>
                        )
                      })}

                      {/* Furniture Items */}
                      {furnitureItems.map(item => {
                        const ix = ox + (item.position[0] + roomL / 2 - item.width / 2) * scale
                        const iy = oy + (item.position[2] + roomW / 2 - item.depth / 2) * scale
                        const iw = Math.max(12, item.width * scale)
                        const ih = Math.max(12, item.depth * scale)
                        const isSel = item.id === selectedFurnitureId

                        return (
                          <g
                            key={item.id}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedFurnitureId(item.id)
                              setSelectedOpening(null)
                            }}
                          >
                            <rect
                              x={ix}
                              y={iy}
                              width={iw}
                              height={ih}
                              fill={isSel ? '#10b981' : (item.color || '#3b82f6')}
                              fillOpacity={isSel ? '0.9' : '0.65'}
                              stroke={isSel ? '#34d399' : '#94a3b8'}
                              strokeWidth={isSel ? '2.5' : '1'}
                              rx="3"
                            />
                            <text
                              x={ix + iw / 2}
                              y={iy + ih / 2 + 3}
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                              className="pointer-events-none"
                            >
                              {item.name.length > 12 ? item.name.slice(0, 10) + '…' : item.name}
                            </text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })()}
              </svg>
            </div>
          </div>
        ) : activeViewerMode === 'worldlabs' ? (
          <div className="w-full h-full relative bg-slate-950 flex flex-col items-center justify-center">
            {worldLabsStatus === 'ready' && worldLabsViewerUrl ? (
              <div className="w-full h-full relative bg-slate-950 flex flex-col">
                <iframe
                  src={worldLabsViewerUrl}
                  title="Photorealistic 3D Space Walkthrough"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
                  allowFullScreen
                />
              </div>
            ) : (worldLabsStatus === 'generating' || worldLabsStatus === 'preparing') ? (
              <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6 animate-in fade-in">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reconstructing 3D Room</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {worldLabsStatusDetail}
                  </p>
                </div>
                <div className="space-y-2 text-left bg-slate-950/70 p-4 rounded-xl border border-slate-800/60 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Photographs validated & staged</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Multi-view perspective analysis</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-200">
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-emerald-400" />
                    <span className="font-semibold text-white">Generating 3D geometry & Gaussian Splats</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-500">
                    <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px]">4</div>
                    <span>Finalizing interactive walkthrough</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                  Neural 3D spatial reconstruction typically takes 2-4 minutes. You can freely switch back to the Architectural CAD view while processing continues.
                </div>
                <button
                  onClick={() => setActiveViewerMode('threejs')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Switch to Architectural CAD Layout &rarr;
                </button>
              </div>
            ) : worldLabsStatus === 'error' ? (
              <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-2xl text-center space-y-5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reconstruction Issue Encountered</h3>
                  <p className="text-xs text-rose-400/90 mt-1">
                    {worldLabsErrorMsg || 'The 3D reconstruction service encountered an unexpected error.'}
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    onClick={() => setActiveViewerMode('threejs')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    View CAD Layout
                  </button>
                  <button
                    onClick={handleTriggerWorldLabs}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry 3D Reconstruction</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reconstruct 3D Room from Photographs</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Generate an interactive, photorealistic 3D room model from your uploaded photos using World Labs Marble AI.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Uploaded Photos:</span>
                    <span className="font-semibold text-white">
                      {images.filter(i => i.status === 'ready').length} ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Reconstruction Engine:</span>
                    <span className="font-mono text-emerald-400">Marble 1.1 Neural Splatting</span>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-1">
                  <button
                    onClick={() => setActiveViewerMode('threejs')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    View CAD Layout
                  </button>
                  <button
                    onClick={handleTriggerWorldLabs}
                    disabled={images.filter(i => i.status === 'ready').length === 0}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 3D Room Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        )}

        {/* Top Floating Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          {/* Camera View Mode Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-lg pointer-events-auto">
            <button
              onClick={() => {
                setActiveViewerMode('threejs')
                setCameraView('eye')
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeViewerMode === 'threejs' && cameraPreset === 'eye'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="First-person human floor eye-level perspective (click anywhere on floor to step forward)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>🚶 Street View</span>
            </button>

            <button
              onClick={() => {
                setActiveViewerMode('threejs')
                setCameraView('orbit')
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeViewerMode === 'threejs' && cameraPreset === 'orbit'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>3D Orbit</span>
            </button>

            <button
              onClick={() => {
                setActiveViewerMode('threejs')
                setCameraView('top')
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeViewerMode === 'threejs' && cameraPreset === 'top'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Top Plan</span>
            </button>

            {activeViewerMode === 'threejs' && (
              <button
                onClick={() => setDragMode(!dragMode)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  dragMode
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
                title="Toggle Interactive Floor Drag Mode"
              >
                <Move className="w-3.5 h-3.5" />
                <span>{dragMode ? 'Drag Active' : 'Drag'}</span>
              </button>
            )}

            {/* Photorealistic AI Walkthrough Toggle */}
            <button
              onClick={() => {
                if (activeViewerMode === 'worldlabs') {
                  setActiveViewerMode('threejs')
                } else {
                  setActiveViewerMode('worldlabs')
                  if (!worldLabsViewerUrl && worldLabsStatus === 'idle') {
                    handleTriggerWorldLabs()
                  }
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                activeViewerMode === 'worldlabs'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30'
              }`}
              title="View photorealistic full 3D spatial reconstruction"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeViewerMode === 'worldlabs' ? 'Photorealistic 3D Active' : 'Photorealistic 3D View'}</span>
            </button>
          </div>

          {/* Visibility & Dimension Controls */}
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-lg pointer-events-auto">
            {/* Dimension Honesty Calibration Button */}
            <button
              onClick={() => setIsDimensionModalOpen(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                dimensionConfirmation?.confirmedByUser
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
              title="Calibrate & Verify Room Dimensions"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>
                {dimensionConfirmation?.confirmedByUser
                  ? `${model.dimensions.length}m × ${model.dimensions.width}m (Confirmed)`
                  : `${model.dimensions.length}m × ${model.dimensions.width}m (Estimated)`}
              </span>
            </button>

            {activeViewerMode === 'worldlabs' && worldLabsViewerUrl && (
              <>
                <a
                  href={worldLabsViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Open 3D reconstruction in full viewport tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </a>
                <button
                  onClick={handleTriggerWorldLabs}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Regenerate 3D Room from photographs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regen</span>
                </button>
              </>
            )}

            {activeViewerMode === 'threejs' && (
              <>
                <button
                  onClick={() => setShowCeiling(!showCeiling)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showCeiling
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Ceiling"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showCeiling ? 'Ceiling' : 'Cut Ceiling'}</span>
                </button>

                <button
                  onClick={() => setWallTransparency(wallTransparency === 0.85 ? 0.35 : 0.85)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
                  title="Toggle Wall Transparency"
                >
                  <span>{wallTransparency === 0.85 ? 'Solid' : 'X-Ray'}</span>
                </button>
              </>
            )}

            {/* Photo Comparison Toggle */}
            <button
              onClick={() => setShowPhotoComparison(!showPhotoComparison)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                showPhotoComparison
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border-transparent'
              }`}
              title="Compare with Original Uploaded Room Photo"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Original Photo</span>
            </button>

            <span className="text-[11px] font-mono text-emerald-400 px-2 py-1 bg-slate-800/80 rounded border border-slate-700/60">
              {fps} FPS
            </span>
          </div>
        </div>

        {/* Bottom Floating Legend */}
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 flex items-center space-x-3 pointer-events-auto">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Detected Item</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Front Clearance Zone</span>
            </div>
          </div>
          {cameraPreset === 'eye' && (
            <div className="bg-emerald-950/80 backdrop-blur border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 pointer-events-auto">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              <span>Click on floor ahead to glide forward (Google Street View)</span>
            </div>
          )}
        </div>

        {/* Street View Navigation Compass (Bottom Right) */}
        {cameraPreset === 'eye' && activeViewerMode === 'threejs' && (
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-2xl shadow-2xl flex flex-col items-center space-y-1.5 pointer-events-auto z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Walk Compass</span>
            <div className="grid grid-cols-3 gap-1 w-28 h-28 place-items-center">
              {/* Top row */}
              <button
                onClick={() => handleTurnHeading(-Math.PI / 4)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center text-xs"
                title="Turn Left 45&deg;"
              >
                ↺
              </button>
              <button
                onClick={() => handleStepDirection('forward')}
                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center font-bold"
                title="Step Forward (1.2m)"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleTurnHeading(Math.PI / 4)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center text-xs"
                title="Turn Right 45&deg;"
              >
                ↻
              </button>

              {/* Middle row */}
              <button
                onClick={() => handleStepDirection('left')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center"
                title="Strafe Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <button
                onClick={() => handleStepDirection('right')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center"
                title="Strafe Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Bottom row */}
              <div />
              <button
                onClick={() => handleStepDirection('backward')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center"
                title="Step Backward"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <div />
            </div>
          </div>
        )}

        {/* Photo Comparison Side-by-Side Floating Modal */}
        {showPhotoComparison && (
          <div className="absolute top-16 left-4 w-96 bg-slate-900/95 backdrop-blur border border-amber-500/40 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-auto z-20 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Photo Reference & Feature Match</h4>
              </div>
              <button
                onClick={() => setShowPhotoComparison(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {images && images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video bg-black">
                  <img
                    src={images[0].dataUrl}
                    alt="Original Uploaded Room"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-medium">
                    Input Photo
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Architectural Checklist Matched:
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    &bull; Wooden floor planks + rustic timber rafters & ridge beam
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    &bull; Loft mezzanine platform with timber handrails & rungs
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    &bull; Kitchen counter + Mint retro fridge + Timber ladder
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    &bull; Window frame with glass & outdoor mountain greenery
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No original photo uploaded for this project.</p>
            )}
          </div>
        )}

        {/* Selected Furniture Inspector & Direct Transformation Controls */}
        {selectedFurniture && (
          <div className="absolute top-20 right-4 w-80 bg-slate-900/95 backdrop-blur border border-emerald-500/50 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-auto animate-in fade-in slide-in-from-right-2">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                  {selectedFurniture.category} &bull; {selectedFurniture.room}
                </span>
                <h4 className="text-sm font-bold text-white">{selectedFurniture.name}</h4>
              </div>
              <button
                onClick={() => setSelectedFurnitureId(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                &times;
              </button>
            </div>

            {/* Live Spatial Feasibility Constraint HUD */}
            {liveStatus && (
              <div className={`flex items-center space-x-2 p-2 rounded-xl text-xs font-semibold border ${
                liveStatus.isValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {liveStatus.isValid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{liveStatus.message}</span>
              </div>
            )}

            {/* Architectural Dimensions */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Dimensions:</span>
                <span className="font-mono text-white font-semibold">
                  {selectedFurniture.width.toFixed(2)}m &times; {selectedFurniture.height.toFixed(2)}m &times; {selectedFurniture.depth.toFixed(2)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clearance Required:</span>
                <span className="font-mono text-emerald-400">
                  Front: {selectedFurniture.clearanceRequired.frontMeters}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Position [X, Y, Z]:</span>
                <span className="font-mono text-white text-[11px]">
                  [{selectedFurniture.position[0].toFixed(2)}, {selectedFurniture.position[1].toFixed(2)}, {selectedFurniture.position[2].toFixed(2)}]
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rotation Angle:</span>
                <span className="font-mono text-white text-[11px]">
                  {Math.round((selectedFurniture.rotation[1] * 180) / Math.PI)}&deg;
                </span>
              </div>
              {selectedFurniture.standardsReference && (
                <div className="text-[10px] text-slate-500 italic pt-0.5">
                  Standard: {selectedFurniture.standardsReference}
                </div>
              )}
            </div>

            {/* Direct 3D Controls (Position, Elevation, Rotation, Snap, Clone, Delete) */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nudge Controls</span>
                </div>
                {/* Step Size Selector */}
                <div className="flex items-center space-x-1">
                  {[0.1, 0.25, 0.5].map((step) => (
                    <button
                      key={step}
                      onClick={() => setNudgeStep(step)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        nudgeStep === step
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {step}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Nudge Buttons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-slate-800/80 rounded-lg p-1.5">
                  <span className="text-slate-400 text-[11px]">X Axis</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMovePosition('x', -nudgeStep)}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono"
                      title={`Move Left (-${nudgeStep}m)`}
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleMovePosition('x', nudgeStep)}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono"
                      title={`Move Right (+${nudgeStep}m)`}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-800/80 rounded-lg p-1.5">
                  <span className="text-slate-400 text-[11px]">Z Axis</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMovePosition('z', -nudgeStep)}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono"
                      title={`Move Forward (-${nudgeStep}m)`}
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleMovePosition('z', nudgeStep)}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono"
                      title={`Move Backward (+${nudgeStep}m)`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Elevation Y Control */}
              <div className="flex items-center justify-between bg-slate-800/80 rounded-lg p-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Elevation (Y)</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleElevateY(-0.1)}
                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono flex items-center gap-0.5 text-[10px]"
                    title="Lower (-0.1m)"
                  >
                    <ArrowDown className="w-3 h-3" /> Lower
                  </button>
                  <button
                    onClick={() => handleElevateY(0.1)}
                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono flex items-center gap-0.5 text-[10px]"
                    title="Lift (+0.1m)"
                  >
                    <ArrowUp className="w-3 h-3" /> Lift
                  </button>
                </div>
              </div>

              {/* 3D Action Tools: Rotate, Snap-to-Wall, Duplicate, Delete */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleRotate}
                  className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90&deg;</span>
                </button>

                <button
                  onClick={handleSnapToWall}
                  className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-colors"
                  title="Snap flush against nearest perimeter wall"
                >
                  <Magnet className="w-3.5 h-3.5" />
                  <span>Snap to Wall</span>
                </button>

                <button
                  onClick={handleDuplicate}
                  className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
                  title="Duplicate this piece in room"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
                  title="Remove this item from scene"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Opening (Door/Window) Overlay */}
        {selectedOpening && (
          <div className="absolute top-20 right-4 w-72 bg-slate-900/95 backdrop-blur border border-cyan-500/40 rounded-xl p-4 shadow-2xl space-y-2 pointer-events-auto animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">
                  Aperture: {selectedOpening.type}
                </span>
                <h4 className="text-sm font-bold text-white">{selectedOpening.label}</h4>
              </div>
              <button
                onClick={() => setSelectedOpening(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                &times;
              </button>
            </div>
            <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Dimensions:</span>
                <span className="font-mono text-white">
                  {selectedOpening.width.toFixed(2)}m &times; {selectedOpening.height.toFixed(2)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Passage Clearance:</span>
                <span className="text-cyan-400">Preserved</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Furniture Roster Table below 3D canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Box className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Room Furniture Representation ({furnitureItems.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click any row to select & inspect in 3D
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {furnitureItems.map((item) => {
            const isSelected = item.id === selectedFurnitureId
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedFurnitureId(item.id)
                  setSelectedOpening(null)
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-white line-clamp-1">{item.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 capitalize shrink-0 font-medium">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                    <div>W: {item.width}m &bull; H: {item.height}m &bull; D: {item.depth}m</div>
                    <div className="text-slate-500">
                      Pos: [{item.position[0]}, {item.position[1]}, {item.position[2]}]
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Front Clearance: {item.clearanceRequired.frontMeters}m
                  </span>
                  <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isSelected ? 'Selected' : 'Select &rarr;'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Honest Dimension Calibration & Verification Modal */}
      <DimensionHonestyModal
        isOpen={isDimensionModalOpen}
        onClose={() => setIsDimensionModalOpen(false)}
        currentEstimated={{
          length: model.dimensions.length,
          width: model.dimensions.width,
          height: model.dimensions.height
        }}
        confirmedData={dimensionConfirmation ? {
          confirmedByUser: dimensionConfirmation.confirmedByUser,
          calibratedLength: dimensionConfirmation.calibratedLength ?? model.dimensions.length,
          calibratedWidth: dimensionConfirmation.calibratedWidth ?? model.dimensions.width,
          calibratedHeight: dimensionConfirmation.calibratedHeight ?? model.dimensions.height,
          notes: dimensionConfirmation.notes
        } : undefined}
        onSaveConfirmedDimensions={(confirmed) => {
          if (onUpdateDimensions) {
            onUpdateDimensions(confirmed)
          }
        }}
      />
    </div>
  )
}
