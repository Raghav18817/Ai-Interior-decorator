import React, { useState, useEffect } from 'react'
import { Sparkles, Clock, AlertCircle } from 'lucide-react'
import { AICreditsState } from '../services/vaastuService'

interface AICreditsBadgeProps {
  creditsState: AICreditsState
  onRefresh?: () => void
}

export const AICreditsBadge: React.FC<AICreditsBadgeProps> = ({
  creditsState,
  onRefresh
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const diff = creditsState.nextResetTimestamp - now

      if (diff <= 0) {
        setTimeLeft('Resetting...')
        onRefresh?.()
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [creditsState.nextResetTimestamp, onRefresh])

  const isLow = creditsState.creditsRemaining <= 2 && creditsState.creditsRemaining > 0
  const isExhausted = creditsState.isExhausted || creditsState.creditsRemaining === 0

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowTooltip(prev => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm border ${
          isExhausted
            ? 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/50'
            : isLow
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
        }`}
        title="Vaastu.ai Credit Balance"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isExhausted ? 'text-red-400' : 'text-emerald-400 animate-pulse'}`} />
        <span>
          Vaastu.ai: <strong>{creditsState.creditsRemaining}</strong>/{creditsState.dailyAllowance}
        </span>
        <div className="flex items-center text-[10px] opacity-75 border-l border-current/20 pl-1.5 ml-0.5">
          <Clock className="w-2.5 h-2.5 mr-1" />
          <span>{timeLeft}</span>
        </div>
      </button>

      {/* Floating Info Dropdown / Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-xl p-3 shadow-2xl z-50 text-neutral-200 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Vaastu.ai AI Credits
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isExhausted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {creditsState.creditsRemaining} Remaining
            </span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed mb-2.5">
            Each natural language room inquiry or 3D layout modification consumes 1 AI credit. Credits are server-authoritative and protect against API abuse.
          </p>

          <div className="bg-neutral-800/80 rounded-lg p-2 space-y-1.5 border border-neutral-700/50">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-400">Daily Allowance:</span>
              <span className="text-neutral-200 font-medium">{creditsState.dailyAllowance} credits</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-400">Reset Time:</span>
              <span className="text-emerald-400 font-medium">{creditsState.resetTimeFormatted}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-400">Next Reset In:</span>
              <span className="text-neutral-200 font-mono">{timeLeft}</span>
            </div>
          </div>

          {isExhausted && (
            <div className="mt-2.5 flex items-start gap-1.5 p-2 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-[10px] leading-snug">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400 mt-0.5" />
              <span>You have reached your daily credit limit. Additional inquiries will be available at {creditsState.resetTimeFormatted} ({timeLeft}).</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
