import React, { useMemo } from 'react'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from '../services/reconstructionEngine'
import { 
  validateRoomLayout, 
  autoFixValidationIssues 
} from '../services/changeValidationEngine'
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Wand2, 
  RefreshCw, 
  Info
} from 'lucide-react'

interface ChangeValidationInspectorProps {
  furniture: FurnitureItem[]
  roomDimensions: { length: number; width: number; height: number }
  openings: Opening3D[]
  onApplyAutoFix: (fixedFurniture: FurnitureItem[]) => void
}

export function ChangeValidationInspector({
  furniture,
  roomDimensions,
  openings,
  onApplyAutoFix
}: ChangeValidationInspectorProps) {
  const [revalidateKey, setRevalidateKey] = React.useState(0)

  const report = useMemo(() => {
    return validateRoomLayout(furniture, roomDimensions, openings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [furniture, roomDimensions, openings, revalidateKey])

  const handleAutoFix = () => {
    const fixed = autoFixValidationIssues(furniture, roomDimensions, openings)
    onApplyAutoFix(fixed)
    setRevalidateKey(prev => prev + 1)
  }

  const scoreColor = report.score >= 85 
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
    : report.score >= 60 
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' 
      : 'text-rose-400 border-rose-500/30 bg-rose-500/10'

  const fixableCount = report.issues.filter(i => i.autoFixAvailable).length

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Automated Multi-Point Feasibility Validator</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Neufert Code Check
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Rigorous verification of 3D collisions, room boundary containment, door accessibility, daylight clearance, and ergonomic spacing.
            </p>
          </div>
        </div>

        <button
          onClick={() => setRevalidateKey(prev => prev + 1)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          title="Refresh spatial validation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-validate</span>
        </button>
      </div>

      {/* Health Score Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Meter */}
        <div className={`rounded-xl border p-5 flex items-center space-x-4 ${scoreColor}`}>
          <div className="text-3xl font-extrabold font-mono tracking-tight">
            {report.score}%
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Room Health Score</div>
            <div className="text-xs opacity-90 mt-0.5">
              {report.overallStatus === 'passed' && 'Fully Code-Compliant'}
              {report.overallStatus === 'warning' && 'Compliant with Minor Warnings'}
              {report.overallStatus === 'failed' && 'Constraint Violations Detected'}
            </div>
          </div>
        </div>

        {/* Checks Passed Ratio */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="text-2xl font-bold text-white font-mono">
            {report.passedChecks}/{report.totalChecks}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Architectural Checks</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {report.passedChecks === report.totalChecks ? 'All spatial points satisfied' : `${report.totalChecks - report.passedChecks} checkpoints flagged`}
            </div>
          </div>
        </div>

        {/* Action / Auto-Fix Tile */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Auto-Solvable Issues:</span>
            <span className="font-mono font-bold text-white">{fixableCount}</span>
          </div>
          <button
            onClick={handleAutoFix}
            disabled={fixableCount === 0}
            className="mt-3 w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 text-xs font-bold transition-all shadow"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Resolve Spatial Issues</span>
          </button>
        </div>
      </div>

      {/* 6 Category Summary Checkpoints */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Feasibility Checkpoints Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.categories.map((cat, idx) => {
            const isOk = cat.status === 'passed'
            const isWarn = cat.status === 'warning'
            return (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate">{cat.name}</span>
                  {isOk && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                  {!isOk && !isWarn && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 leading-tight">
                  {cat.message}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Issues List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Detected Spatial Issues & Recommendations ({report.issues.length})
          </h3>
          {report.issues.length === 0 && (
            <span className="text-xs text-emerald-400 font-medium">Room layout is clean</span>
          )}
        </div>

        {report.issues.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-white">No Spatial Violations Found</div>
            <div className="text-xs text-slate-400 max-w-md mx-auto">
              All furniture pieces respect collision boundaries, interior room bounds, doorway swing corridors, window elevations, and circulation paths.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {report.issues.map((issue) => {
              const isErr = issue.severity === 'error'
              const isWarn = issue.severity === 'warning'

              return (
                <div
                  key={issue.id}
                  className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                    isErr 
                      ? 'bg-rose-500/5 border-rose-500/20' 
                      : isWarn 
                        ? 'bg-amber-500/5 border-amber-500/20' 
                        : 'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      {isErr && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                      {!isErr && !isWarn && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                      <span className="text-sm font-semibold text-white">{issue.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide font-mono ${
                      isErr 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : isWarn 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {issue.checkType.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {issue.description}
                  </p>

                  {issue.affectedItemNames.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span className="text-slate-500">Items:</span>
                      <div className="flex flex-wrap gap-1">
                        {issue.affectedItemNames.map((name, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {issue.suggestedFix && (
                    <div className="text-xs text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 flex items-start gap-2">
                      <Wand2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                      <span><strong>Recommendation:</strong> {issue.suggestedFix}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Architecture Code Standards Reference */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>Architectural Compliance Standards Reference:</span>
        </div>
        <p className="leading-relaxed">
          Validation follows Neufert Architects' Data & Architectural Graphic Standards: Doorway ingress corridor &ge; 0.85m; study desk front operating zone &ge; 0.75m; maximum floor occupancy density &le; 45%; and daylight window elevation preservation.
        </p>
      </div>
    </div>
  )
}
