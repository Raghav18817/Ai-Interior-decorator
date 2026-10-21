import { useState } from 'react'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from '../services/reconstructionEngine'
import { OptimizedLayoutProposal, OptimizationGoal } from '../types/optimization'
import { optimizeRoomLayout } from '../services/spaceOptimizationEngine'
import { 
  Sparkles, 
  ArrowRight, 
  Move, 
  RotateCw, 
  Plus, 
  Trash2, 
  RefreshCw,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react'

interface SpaceOptimizationPanelProps {
  furniture: FurnitureItem[]
  roomDimensions: {
    length: number
    width: number
    height: number
  }
  openings: Opening3D[]
  onAcceptProposal: (optimizedFurniture: FurnitureItem[]) => void
}

const OPTIMIZATION_STRATEGIES: { id: OptimizationGoal; label: string; desc: string }[] = [
  {
    id: 'maximize_space',
    label: 'Maximize Walking Space',
    desc: 'Pushes pieces flush to walls and clears central circulation paths'
  },
  {
    id: 'add_workspace',
    label: 'Add Study / Work Area',
    desc: 'Integrates an executive desk and ergonomic chair without blocking doors'
  },
  {
    id: 'entertainment_focus',
    label: 'Optimize for TV & Media',
    desc: 'Realigns sofa and credenza for direct perpendicular viewing angles'
  },
  {
    id: 'replace_bulky',
    label: 'Replace Bulky Furniture',
    desc: 'Substitutes oversized pieces with space-saving architectural alternatives'
  }
]

export function SpaceOptimizationPanel({
  furniture,
  roomDimensions,
  openings,
  onAcceptProposal
}: SpaceOptimizationPanelProps) {
  const [selectedGoal, setSelectedGoal] = useState<OptimizationGoal>('maximize_space')
  const [proposal, setProposal] = useState<OptimizedLayoutProposal | null>(null)

  const handleGenerateProposal = (goal: OptimizationGoal) => {
    setSelectedGoal(goal)
    const result = optimizeRoomLayout({
      goal,
      furniture,
      roomDimensions,
      openings
    })
    setProposal(result)
  }

  const handleAccept = () => {
    if (!proposal) return
    onAcceptProposal(proposal.proposedFurniture)
    setProposal(null)
  }

  const handleReject = () => {
    setProposal(null)
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'moved':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Move className="w-3 h-3" />
            <span>MOVED</span>
          </span>
        )
      case 'rotated':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RotateCw className="w-3 h-3" />
            <span>ROTATED</span>
          </span>
        )
      case 'added':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Plus className="w-3 h-3" />
            <span>ADDED</span>
          </span>
        )
      case 'removed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-3 h-3" />
            <span>REMOVED</span>
          </span>
        )
      case 'replaced':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <RefreshCw className="w-3 h-3" />
            <span>REPLACED</span>
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Strategy Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Space & Layout Optimization Engine</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Re-calculates spatial arrangements with strict collision prevention and walking clearance preservation.
          </p>
          {furniture.length === 0 && (
            <div className="mt-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center space-x-2 text-xs text-slate-300">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Empty room detected. You can select <strong className="text-white">"Add Study / Work Area"</strong> below to automatically furnish this room, or add pieces from the Furniture catalog.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {OPTIMIZATION_STRATEGIES.map((strat) => (
            <button
              key={strat.id}
              onClick={() => handleGenerateProposal(strat.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedGoal === strat.id && proposal
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <div>
                <h4 className="text-xs font-bold text-white">{strat.label}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{strat.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
                <span>Generate Plan</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Non-Destructive Layout Proposal Display */}
      {proposal ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Proposal Summary Bar & Accept/Reject Controls */}
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Proposed Layout Plan
                </span>
                <h3 className="text-base font-bold text-white">{proposal.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{proposal.summary}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Reject / Keep Current
                </button>
                <button
                  onClick={handleAccept}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Proposed Layout</span>
                </button>
              </div>
            </div>

            {/* Metrics Comparison Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Density</span>
                <span className="text-white font-bold">
                  {proposal.metrics.originalOccupancyPercent}% &rarr;{' '}
                  <span className="text-emerald-400">{proposal.metrics.proposedOccupancyPercent}%</span>
                </span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Circulation Gain</span>
                <span className="text-emerald-400 font-bold">+{proposal.metrics.circulationGainM2} m&sup2;</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Walking Corridor</span>
                <span className="text-white font-bold">&ge; {proposal.metrics.walkingClearanceM}m</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center space-x-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold">Zero Collision Verified</span>
              </div>
            </div>
          </div>

          {/* Current Layout vs Proposed Layout Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CURRENT LAYOUT (Left) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Current Layout ({proposal.originalFurniture.length} items)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Active Design</span>
              </div>

              <div className="space-y-2">
                {proposal.originalFurniture.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.width}m &times; {item.depth}m
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-slate-400">
                      Pos: [{item.position[0]}, {item.position[2]}]
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROPOSED LAYOUT (Right) */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Proposed Layout ({proposal.proposedFurniture.length} items)
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">Optimized Alternative</span>
              </div>

              <div className="space-y-2">
                {proposal.proposedFurniture.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {item.width}m &times; {item.depth}m
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-emerald-400 font-semibold">
                      Pos: [{item.position[0]}, {item.position[2]}]
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Change Breakdown Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Exact Modifications Log ({proposal.changes.length})
            </h4>

            <div className="divide-y divide-slate-800/80">
              {proposal.changes.map((chg) => (
                <div key={chg.id} className="py-3 flex items-start space-x-3 text-xs">
                  <div className="shrink-0 mt-0.5">{getActionBadge(chg.action)}</div>
                  <div className="space-y-1">
                    <span className="font-bold text-white">{chg.targetItemName}</span>
                    <p className="text-slate-300 text-xs">{chg.description}</p>
                    {chg.previousState && chg.newState && (
                      <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                        {chg.previousState.position && chg.newState.position && (
                          <span>
                            [{chg.previousState.position[0]}, {chg.previousState.position[2]}] &rarr; [{chg.newState.position[0]}, {chg.newState.position[2]}]
                          </span>
                        )}
                        {chg.previousState.dimensions && chg.newState.dimensions && (
                          <span>
                            {chg.previousState.dimensions} &rarr; {chg.newState.dimensions}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Select an Optimization Goal Above</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Choose a strategy to analyze room circulation and preview a non-destructive alternative arrangement before applying it.
          </p>
        </div>
      )}
    </div>
  )
}
