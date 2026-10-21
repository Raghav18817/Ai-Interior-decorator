import { useState } from 'react'
import { Ruler, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react'

export interface DimensionHonestyData {
  confirmedByUser: boolean
  calibratedLength: number
  calibratedWidth: number
  calibratedHeight: number
  notes?: string
}

interface DimensionHonestyModalProps {
  isOpen: boolean
  onClose: () => void
  currentEstimated: { length: number; width: number; height: number }
  confirmedData?: DimensionHonestyData
  onSaveConfirmedDimensions: (data: DimensionHonestyData) => void
}

export function DimensionHonestyModal({
  isOpen,
  onClose,
  currentEstimated,
  confirmedData,
  onSaveConfirmedDimensions
}: DimensionHonestyModalProps) {
  const [length, setLength] = useState<number>(() => confirmedData?.calibratedLength ?? currentEstimated.length)
  const [width, setWidth] = useState<number>(() => confirmedData?.calibratedWidth ?? currentEstimated.width)
  const [height, setHeight] = useState<number>(() => confirmedData?.calibratedHeight ?? currentEstimated.height)
  const [notes, setNotes] = useState<string>(() => confirmedData?.notes ?? '')
  const [isConfirmed, setIsConfirmed] = useState<boolean>(() => confirmedData?.confirmedByUser ?? false)

  if (!isOpen) return null

  const handleSave = () => {
    onSaveConfirmedDimensions({
      confirmedByUser: isConfirmed,
      calibratedLength: Math.max(1.5, Math.min(25, Number(length) || currentEstimated.length)),
      calibratedWidth: Math.max(1.5, Math.min(25, Number(width) || currentEstimated.width)),
      calibratedHeight: Math.max(2.0, Math.min(8, Number(height) || currentEstimated.height)),
      notes: notes.trim()
    })
    onClose()
  }

  const handleResetToEstimated = () => {
    setLength(currentEstimated.length)
    setWidth(currentEstimated.width)
    setHeight(currentEstimated.height)
    setIsConfirmed(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Dimension Calibration & Verification</h3>
              <p className="text-xs text-slate-400">Distinguishing estimated vs confirmed real-world geometry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Current Geometry Status:</span>
            {isConfirmed ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confirmed & Measured</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Estimated (Unconfirmed)</span>
              </span>
            )}
          </div>

          {/* Honesty Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
            <p>
              <strong>Dimensional Honesty Notice:</strong> Photo-based 3D neural reconstruction estimates geometry from optical perspective cues. For precise furniture clearance and construction fit, confirm room bounds with a physical tape or laser distance measure.
            </p>
          </div>

          {/* Dimension Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">
                Length (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="1.5"
                max="25"
                value={length}
                onChange={(e) => {
                  setLength(parseFloat(e.target.value) || 0)
                  setIsConfirmed(true)
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Estimated: {currentEstimated.length.toFixed(2)}m
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">
                Width (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="1.5"
                max="25"
                value={width}
                onChange={(e) => {
                  setWidth(parseFloat(e.target.value) || 0)
                  setIsConfirmed(true)
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Estimated: {currentEstimated.width.toFixed(2)}m
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">
                Height (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="2.0"
                max="8.0"
                value={height}
                onChange={(e) => {
                  setHeight(parseFloat(e.target.value) || 0)
                  setIsConfirmed(true)
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Estimated: {currentEstimated.height.toFixed(2)}m
              </span>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2.5 pt-1">
            <input
              type="checkbox"
              id="confirmDimensionsCheckbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="confirmDimensionsCheckbox" className="text-xs text-slate-300 leading-normal cursor-pointer">
              I have physically verified or measured these room dimensions with a tape or laser meter.
            </label>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Calibration Reference Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Laser measured along baseboards"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetToEstimated}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Reset to Estimated
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Dimensions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
