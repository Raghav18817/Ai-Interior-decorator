import { useState, useMemo } from 'react'
import { STANDARD_DEVICES } from '../data/deviceCatalog'
import { calculateDevicePlacements } from '../services/devicePlacementEngine'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from '../services/reconstructionEngine'
import { 
  Tv, 
  Gamepad2, 
  Volume2, 
  Monitor, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Zap, 
  Info
} from 'lucide-react'

interface DevicePlacementPanelProps {
  roomDimensions: {
    length: number
    width: number
    height: number
  }
  furniture: FurnitureItem[]
  openings: Opening3D[]
  onAddDeviceToScene: (item: FurnitureItem) => void
}

export function DevicePlacementPanel({
  roomDimensions,
  furniture,
  openings,
  onAddDeviceToScene
}: DevicePlacementPanelProps) {
  // Default selected devices: TV 55", Soundbar, Gaming Console
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([
    'dev_tv_55',
    'dev_soundbar',
    'dev_console'
  ])
  const [powerConfirmed, setPowerConfirmed] = useState(false)
  const [addedDeviceIds, setAddedDeviceIds] = useState<Set<string>>(new Set())

  const recommendations = useMemo(() => {
    return calculateDevicePlacements({
      deviceIds: selectedDeviceIds,
      roomDimensions,
      furniture,
      openings,
      userConfirmedPower: powerConfirmed
    })
  }, [selectedDeviceIds, roomDimensions, furniture, openings, powerConfirmed])

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'television': return <Tv className="w-4 h-4 text-emerald-400" />
      case 'audio': return <Volume2 className="w-4 h-4 text-sky-400" />
      case 'gaming': return <Gamepad2 className="w-4 h-4 text-indigo-400" />
      case 'computing': return <Monitor className="w-4 h-4 text-teal-400" />
      case 'network': return <Wifi className="w-4 h-4 text-amber-400" />
      default: return <Tv className="w-4 h-4 text-emerald-400" />
    }
  }

  const handlePlaceIn3D = (rec: (typeof recommendations)[0]) => {
    // Map device recommendation to FurnitureItem so it renders directly in Three.js!
    const newItem: FurnitureItem = {
      id: `dev_placed_${rec.device.id}_${Date.now()}`,
      type: rec.device.category === 'television' ? 'tv_console' : 'decor',
      name: rec.device.name,
      category: 'electronics',
      width: rec.device.widthM,
      height: rec.device.heightM,
      depth: rec.device.depthM,
      position: rec.proposedLocation.position,
      rotation: [0, (rec.orientation.facingAngleDeg * Math.PI) / 180, 0],
      room: 'Living Room',
      color: rec.device.category === 'television' ? '#0f172a' : '#1e293b',
      clearanceRequired: { frontMeters: 0.5, sidesMeters: 0.1 },
      isExisting: false,
      standardsReference: `SMPTE / THX Audio-Visual Placement Standard`
    }

    onAddDeviceToScene(newItem)
    setAddedDeviceIds(prev => new Set(prev).add(rec.device.id))
  }

  return (
    <div className="space-y-6">
      {/* Electronics Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div>
          <div className="flex items-center space-x-2">
            <Tv className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">TV & Smart Device Placement Engine</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Specify desired audio-visual & gaming electronics to calculate viewing angles, wall clearance, and acoustic layout.
          </p>
        </div>

        {/* Electronics Selection Pills */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
            Select Desired Electronics:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {STANDARD_DEVICES.map((dev) => {
              const isSelected = selectedDeviceIds.includes(dev.id)
              return (
                <button
                  key={dev.id}
                  onClick={() => toggleDevice(dev.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/80 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {getDeviceIcon(dev.category)}
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{dev.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {dev.widthM}m &times; {dev.heightM}m
                      </div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Infrastructure & Electrical Disclosure (Anti-Hallucination) */}
        <div className="pt-4 border-t border-slate-800 bg-slate-950/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 text-xs text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Electrical & Power Socket Verification:</span>
              <p className="text-[11px] text-slate-400">
                DECOHOME never fabricates hidden wiring. Confirm electrical outlet presence on target walls to validate placement.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center space-x-2 cursor-pointer shrink-0 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={powerConfirmed}
              onChange={(e) => setPowerConfirmed(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
            />
            <span className="text-xs font-medium text-emerald-400">Confirm Power Outlets Exist</span>
          </label>
        </div>
      </div>

      {/* Generated Placement Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Placement Recommendations ({recommendations.length})
          </h3>
          <span className="text-xs text-slate-400">
            Oriented towards primary seated sightline
          </span>
        </div>

        {recommendations.map((rec) => {
          const isAdded = addedDeviceIds.has(rec.device.id)

          return (
            <div
              key={rec.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all ${
                rec.isFeasible ? 'border-slate-800' : 'border-rose-900/50 bg-slate-900/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    {getDeviceIcon(rec.device.category)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{rec.device.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 uppercase font-semibold">
                        {rec.device.mountType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{rec.reason}</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePlaceIn3D(rec)}
                  disabled={isAdded}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isAdded
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Placed in 3D</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place in 3D Scene</span>
                    </>
                  )}
                </button>
              </div>

              {/* Placement & Sightline Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-semibold">
                    Proposed Location
                  </span>
                  <span className="text-white capitalize font-sans">{rec.proposedLocation.wall} Wall</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Height: {rec.proposedLocation.mountHeightM}m &bull; Pos: [{rec.proposedLocation.position.join(', ')}]
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-semibold">
                    Orientation & Sightline
                  </span>
                  <span className="text-emerald-400 font-sans">{rec.orientation.facingAngleDeg}&deg; Facing</span>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans truncate" title={rec.orientation.sightlineTarget}>
                    Target: {rec.orientation.sightlineTarget}
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-semibold">
                    Viewing Range
                  </span>
                  <span className="text-white font-sans">
                    {rec.device.recommendedViewingDistanceM
                      ? `${rec.device.recommendedViewingDistanceM.min}m – ${rec.device.recommendedViewingDistanceM.max}m`
                      : 'Immediate proximity'}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                    SMPTE / THX Recommended
                  </div>
                </div>
              </div>

              {/* Detected Constraints */}
              {rec.detectedConstraints.length > 0 && (
                <div className="space-y-1 pt-1">
                  {rec.detectedConstraints.map((c, i) => (
                    <div
                      key={i}
                      className={`text-xs px-3 py-2 rounded-xl flex items-start space-x-2 ${
                        c.severity === 'fatal'
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                          : c.severity === 'warning'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                            : 'bg-slate-800/60 border border-slate-700/60 text-slate-400'
                      }`}
                    >
                      {c.severity === 'fatal' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      ) : c.severity === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      )}
                      <span>{c.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
