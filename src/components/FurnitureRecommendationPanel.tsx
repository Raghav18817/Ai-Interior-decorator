import { useState, useMemo } from 'react'
import { FurnitureItem } from '../types/furniture'
import { FurnitureRecommendation } from '../types/recommendation'
import { generateFurnitureRecommendations } from '../services/recommendationEngine'
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus
} from 'lucide-react'

interface FurnitureRecommendationPanelProps {
  roomType: string
  roomDimensions: {
    length: number
    width: number
    height: number
  }
  existingFurniture: FurnitureItem[]
  onAddFurnitureToScene: (item: FurnitureItem) => void
}

const PRESET_REQUIREMENTS = [
  'Add work / study setup',
  'More seating for guests',
  'Add storage & organization',
  'Spacious minimalist lounge'
]

export function FurnitureRecommendationPanel({
  roomType,
  roomDimensions,
  existingFurniture,
  onAddFurnitureToScene
}: FurnitureRecommendationPanelProps) {
  const [userRequirement, setUserRequirement] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'feasible' | 'conflicts'>('all')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  // Generate recommendations based on active parameters
  const recommendations = useMemo(() => {
    return generateFurnitureRecommendations({
      roomType,
      roomDimensions,
      existingFurniture,
      userRequirement
    })
  }, [roomType, roomDimensions, existingFurniture, userRequirement])

  const totalArea = roomDimensions.length * roomDimensions.width
  const occupiedArea = existingFurniture.reduce((sum, f) => sum + (f.width * f.depth), 0)
  const occupancyPercent = totalArea > 0 ? Math.round((occupiedArea / totalArea) * 100) : 0

  const filteredRecommendations = recommendations.filter((rec) => {
    if (activeFilter === 'feasible') return rec.isPhysicallyFeasible
    if (activeFilter === 'conflicts') return !rec.isPhysicallyFeasible
    return true
  })

  const handleAdd = (rec: FurnitureRecommendation) => {
    const newItem: FurnitureItem = {
      id: `furn_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: rec.catalogEntry.type,
      name: rec.catalogEntry.name,
      category: rec.catalogEntry.category,
      width: rec.catalogEntry.defaultWidth,
      height: rec.catalogEntry.defaultHeight,
      depth: rec.catalogEntry.defaultDepth,
      position: rec.suggestedPlacement.position,
      rotation: rec.suggestedPlacement.rotation,
      room: roomType,
      color: rec.catalogEntry.defaultColor,
      clearanceRequired: rec.catalogEntry.clearanceRequired,
      isExisting: false,
      standardsReference: rec.catalogEntry.standardsReference
    }

    onAddFurnitureToScene(newItem)
    setAddedIds((prev) => new Set(prev).add(rec.id))
  }

  return (
    <div className="space-y-6">
      {/* Header & Spatial Health Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">AI Furniture Recommendation Engine</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Constraint-checked architectural furniture suggestions tailored for {roomType}.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-slate-300">
              {roomDimensions.length}m &times; {roomDimensions.width}m ({totalArea.toFixed(1)} m&sup2;)
            </span>
            <span className={`px-3 py-1.5 rounded-xl border font-semibold ${
              occupancyPercent > 50 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {occupancyPercent}% Occupied
            </span>
          </div>
        </div>

        {/* User Requirements Bar */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={userRequirement}
              onChange={(e) => setUserRequirement(e.target.value)}
              placeholder="Specify requirements (e.g., 'need space for 2 people to work', 'cozy reading chair')"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white placeholder-slate-500 text-xs sm:text-sm"
            />
            {userRequirement && (
              <button
                onClick={() => setUserRequirement('')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Preset Requirement Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Quick Presets:</span>
            {PRESET_REQUIREMENTS.map((preset) => (
              <button
                key={preset}
                onClick={() => setUserRequirement(preset)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  userRequirement === preset
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Recommendations ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveFilter('feasible')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'feasible'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Physically Feasible ({recommendations.filter(r => r.isPhysicallyFeasible).length})
          </button>
          <button
            onClick={() => setActiveFilter('conflicts')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'conflicts'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Spatial Conflicts ({recommendations.filter(r => !r.isPhysicallyFeasible).length})
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline-block">
          Physical clearance checked against Neufert architectural norms
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No recommendations match the current filter.
          </div>
        ) : (
          filteredRecommendations.map((rec) => {
            const isAdded = addedIds.has(rec.id)

            return (
              <div
                key={rec.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all ${
                  rec.isPhysicallyFeasible
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-rose-900/40 bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-white">{rec.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                        {rec.catalogEntry.category}
                      </span>
                      {rec.isPhysicallyFeasible ? (
                        <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Feasible Placement</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Physical Conflict</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rec.reason}</p>
                  </div>

                  {/* Add to 3D Button */}
                  {rec.isPhysicallyFeasible && (
                    <button
                      onClick={() => handleAdd(rec)}
                      disabled={isAdded}
                      className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isAdded
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Added to 3D Scene</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to 3D Scene</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Spatial Specs & Suggested Placement Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Required Dimensions
                    </span>
                    <span className="font-mono text-white text-xs">{rec.requiredSpace.dimensions}</span>
                    <span className="text-[11px] text-slate-500 block">
                      Footprint: {rec.requiredSpace.footprintM2} m&sup2;
                    </span>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Ergonomic Clearance
                    </span>
                    <span className="font-mono text-emerald-400 text-xs">
                      Front: {rec.requiredSpace.clearanceDepthM}m
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Walkway circulation buffer
                    </span>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Proposed Placement
                    </span>
                    {rec.suggestedPlacement.fitsWall ? (
                      <div>
                        <span className="font-medium text-white capitalize">
                          {rec.suggestedPlacement.alignedWall} Wall
                        </span>
                        <span className="text-[11px] text-slate-500 block font-mono">
                          Remaining span: {rec.suggestedPlacement.wallLengthAvailable}m
                        </span>
                      </div>
                    ) : (
                      <span className="text-rose-400 font-medium">No wall has sufficient span</span>
                    )}
                  </div>
                </div>

                {/* Conflict Warnings if any */}
                {rec.conflicts.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-rose-400 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Detected Spatial Constraint Conflicts:</span>
                    </div>
                    <ul className="list-disc list-inside text-rose-300 space-y-0.5 pl-1 text-[11px]">
                      {rec.conflicts.map((c, i) => (
                        <li key={i}>{c.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
