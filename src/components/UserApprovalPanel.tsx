import { useState, useMemo } from 'react'
import { FurnitureItem } from '../types/furniture'
import { LayoutRevisionSnapshot } from '../types/approval'
import { 
  computeLayoutDiff, 
  applySelectedChanges 
} from '../services/approvalService'
import { 
  CheckSquare, 
  Square, 
  RotateCcw, 
  Check, 
  X, 
  History, 
  Layers, 
  ArrowRight, 
  Move, 
  Plus, 
  Trash2, 
  RotateCw,
  GitBranch,
  Clock
} from 'lucide-react'

interface UserApprovalPanelProps {
  currentFurniture: FurnitureItem[]
  proposedFurniture: FurnitureItem[] | null
  revisionHistory: LayoutRevisionSnapshot[]
  onApplyChanges: (approvedFurniture: FurnitureItem[], description: string) => void
  onDiscardProposal: () => void
  onRevertToSnapshot: (snapshot: LayoutRevisionSnapshot) => void
}

export function UserApprovalPanel({
  currentFurniture,
  proposedFurniture,
  revisionHistory,
  onApplyChanges,
  onDiscardProposal,
  onRevertToSnapshot
}: UserApprovalPanelProps) {
  const [showHistory, setShowHistory] = useState(false)

  // Compute diff when a proposal exists
  const rawDiff = useMemo(() => {
    if (!proposedFurniture) return []
    return computeLayoutDiff(currentFurniture, proposedFurniture)
  }, [currentFurniture, proposedFurniture])

  // Track selection state of each proposed change item
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Initialize selected IDs whenever a new diff is computed
  useMemo(() => {
    setSelectedIds(rawDiff.map(d => d.id))
  }, [rawDiff])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(rawDiff.map(d => d.id))
  }

  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  const handleCommit = () => {
    if (!proposedFurniture) return
    const approved = applySelectedChanges(currentFurniture, proposedFurniture, selectedIds, rawDiff)
    const count = selectedIds.length
    const desc = `Approved ${count} change(s): ${rawDiff.filter(d => selectedIds.includes(d.id)).map(d => d.name).join(', ')}`
    onApplyChanges(approved, desc)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header & Revert Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Granular Proposal Review & Approval</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Loop 12
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Inspect granular item-by-item spatial changes, accept selective subsets, or revert to any prior layout revision.
            </p>
          </div>
        </div>

        {/* History & Revert Button */}
        <div className="flex items-center space-x-2">
          {revisionHistory.length > 1 && (
            <button
              onClick={() => onRevertToSnapshot(revisionHistory[revisionHistory.length - 2])}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
              title="Undo last change and revert to previous layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert Last</span>
            </button>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              showHistory
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({revisionHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Revision History Snapshot Drawer */}
      {showHistory && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Layout Revision Timeline ({revisionHistory.length} Snapshots)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Click to restore any snapshot</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {revisionHistory.slice().reverse().map((snap, idx) => {
              const isLatest = idx === 0
              return (
                <div
                  key={snap.revisionId}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                    isLatest 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' 
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{snap.description}</span>
                      {isLatest && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                      <span>{snap.timestamp}</span>
                      <span>&bull;</span>
                      <span>{snap.furniture.length} items</span>
                    </div>
                  </div>

                  {!isLatest && (
                    <button
                      onClick={() => onRevertToSnapshot(snap)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Proposal Review Section */}
      {proposedFurniture && rawDiff.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Proposed Layout Diff</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  {rawDiff.length} Modifications
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Check or uncheck individual changes below to selectively approve only desired modifications.
              </p>
            </div>

            {/* Quick Select Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Granular Changes Diff Cards */}
          <div className="space-y-3">
            {rawDiff.map((diff) => {
              const isChecked = selectedIds.includes(diff.id)
              return (
                <div
                  key={diff.id}
                  onClick={() => toggleSelect(diff.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-slate-950/80 border-purple-500/40 shadow-sm shadow-purple-500/5'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(diff.id)
                        }}
                        className="mt-0.5 text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-white">{diff.name}</span>
                          
                          {/* Action Type Badge */}
                          {diff.actionType === 'added' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              <Plus className="w-3 h-3" /> Added
                            </span>
                          )}
                          {diff.actionType === 'moved' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                              <Move className="w-3 h-3" /> Moved
                            </span>
                          )}
                          {diff.actionType === 'replaced' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                              <Layers className="w-3 h-3" /> Replaced
                            </span>
                          )}
                          {diff.actionType === 'removed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                              <Trash2 className="w-3 h-3" /> Removed
                            </span>
                          )}
                          {diff.actionType === 'rotated' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              <RotateCw className="w-3 h-3" /> Rotated
                            </span>
                          )}
                        </div>

                        {/* Impact Description */}
                        <div className="text-xs text-slate-300">
                          {diff.impactDescription}
                        </div>

                        {/* Before vs After Coordinates */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                          {diff.beforeState && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                              Before: [{diff.beforeState.position[0]}, {diff.beforeState.position[2]}] ({diff.beforeState.width}m × {diff.beforeState.depth}m)
                            </span>
                          )}
                          {diff.beforeState && diff.afterState && (
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          )}
                          {diff.afterState && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                              After: [{diff.afterState.position[0]}, {diff.afterState.position[2]}] ({diff.afterState.width}m × {diff.afterState.depth}m)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Decision Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {selectedIds.length} of {rawDiff.length} changes selected
            </span>

            <div className="flex items-center space-x-3">
              <button
                onClick={onDiscardProposal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Discard Proposal</span>
              </button>

              <button
                onClick={handleCommit}
                disabled={selectedIds.length === 0}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Apply Selected ({selectedIds.length}) to 3D Scene</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-white">No Pending Proposals Awaiting Approval</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run an optimization recommendation or natural-language command to generate side-by-side proposals for granular review.
          </p>
          <div className="text-xs text-slate-500 font-mono pt-2">
            Active Layout: {currentFurniture.length} verified pieces in scene
          </div>
        </div>
      )}
    </div>
  )
}
