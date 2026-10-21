import { useState } from 'react'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from '../services/reconstructionEngine'
import { CommandExecutionResult } from '../types/commands'
import { executeNaturalLanguageCommand } from '../services/commandAssistantEngine'
import { 
  Sparkles, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Check, 
  X,
  Layers,
  Info
} from 'lucide-react'

interface NaturalLanguageAssistantProps {
  furniture: FurnitureItem[]
  roomDimensions: { length: number; width: number; height: number }
  openings: Opening3D[]
  onApplyProposal: (newFurniture: FurnitureItem[]) => void
}

const PRESET_COMMANDS = [
  { label: 'Move near window', text: 'Move the sofa near the window' },
  { label: 'Replace with smaller', text: 'Replace the sofa with a smaller one' },
  { label: 'Add study table', text: 'Add a study table' },
  { label: 'More walking space', text: 'I need more walking space' },
  { label: 'TV opposite sofa', text: 'Put the TV opposite the sofa' }
]

export function NaturalLanguageAssistant({
  furniture,
  roomDimensions,
  openings,
  onApplyProposal
}: NaturalLanguageAssistantProps) {
  const [inputText, setInputText] = useState('')
  const [currentResult, setCurrentResult] = useState<CommandExecutionResult | null>(null)
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null)

  const handleExecute = (textToRun?: string) => {
    const text = (textToRun || inputText).trim()
    if (!text) return

    setAppliedSuccess(null)
    const result = executeNaturalLanguageCommand(text, furniture, roomDimensions, openings)
    setCurrentResult(result)
  }

  const handleApply = () => {
    if (!currentResult || !currentResult.canApply) return
    onApplyProposal(currentResult.proposedLayout)
    setAppliedSuccess(`Applied: "${currentResult.actionDescription}"`)
    setCurrentResult(null)
    setInputText('')
  }

  const handleDiscard = () => {
    setCurrentResult(null)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Natural-Language Design Assistant</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Type spatial commands in plain English. The AI parses design intent and validates physical constraints before committing changes.
          </p>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Quick Preset Commands (Loop 10 Scenarios):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COMMANDS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(preset.text)
                handleExecute(preset.text)
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-purple-600/20 hover:border-purple-500/40 text-slate-300 hover:text-purple-300 border border-slate-700/60 transition-all text-left flex items-center gap-1.5"
            >
              <span>{preset.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Command Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleExecute()
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Move the sofa near the window, Add a study table, I need more walking space..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-sm font-semibold transition-colors shadow-lg shadow-purple-600/20"
        >
          <Send className="w-4 h-4" />
          <span>Process</span>
        </button>
      </form>

      {/* Success Notification */}
      {appliedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-400 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{appliedSuccess}</span>
          </div>
          <button
            onClick={() => setAppliedSuccess(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Execution Result & Non-Destructive Review Panel */}
      {currentResult && (
        <div className="border border-slate-800 bg-slate-950/70 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                Intent: {currentResult.parsedIntent.intentType}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Confidence: {Math.round(currentResult.parsedIntent.confidence * 100)}%
              </span>
            </div>

            {/* Validation Badge */}
            <div>
              {currentResult.validationStatus === 'passed' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Validated & Safe
                </span>
              )}
              {currentResult.validationStatus === 'warning' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Minor Proximity Adjustment
                </span>
              )}
              {currentResult.validationStatus === 'failed' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="w-3.5 h-3.5" />
                  Constraint Violation
                </span>
              )}
            </div>
          </div>

          {/* Action Description */}
          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium">Synthesized Proposal:</div>
            <div className="text-sm text-white font-medium mt-1">{currentResult.actionDescription}</div>
          </div>

          {/* Spatial Validation Notes */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-300">Spatial Constraint Checks:</div>
            <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
              {currentResult.validationNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          {/* Affected Items Details */}
          {currentResult.affectedObjects.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="text-xs font-semibold text-slate-300">Affected Objects:</div>
              <div className="flex flex-wrap gap-2">
                {currentResult.affectedObjects.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                  >
                    <Layers className="w-3 h-3 text-purple-400" />
                    {item.name} ({item.width}m × {item.depth}m)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Non-destructive Action Decision Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              onClick={handleDiscard}
              className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Discard Proposal</span>
            </button>
            <button
              onClick={handleApply}
              disabled={!currentResult.canApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Apply to 3D Scene</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
