import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowUp,
  Sparkles,
  RotateCcw,
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  BookOpen,
  Check,
  X,
  Key
} from 'lucide-react'
import { FurnitureItem } from '../types/furniture'
import { Opening3D } from '../services/reconstructionEngine'
import {
  CulturalTradition,
  CULTURAL_TRADITIONS
} from '../services/vaastuKnowledgeService'
import {
  VaastuProposedAction
} from '../services/vaastu3DEngine'
import {
  AICreditsState,
  sendVaastuChatMessage
} from '../services/vaastuService'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  culturalContext?: CulturalTradition
  isTraditionalGuidance?: boolean
  proposedAction?: VaastuProposedAction
  proposalStatus?: 'pending' | 'accepted' | 'rejected'
}

interface VaastuChatPanelProps {
  currentFurniture: FurnitureItem[]
  roomDimensions: { length: number; width: number; height: number }
  openings?: Opening3D[]
  roomType?: string
  compassRotation?: number
  creditsState: AICreditsState
  onCreditsUpdated: (newState: AICreditsState) => void
  onPreviewProposal: (action: VaastuProposedAction | null) => void
  onAcceptProposal: (action: VaastuProposedAction) => void
  onRejectProposal: (action: VaastuProposedAction) => void
  activePreviewAction: VaastuProposedAction | null
  onClose?: () => void
  className?: string
}

export const VaastuChatPanel: React.FC<VaastuChatPanelProps> = ({
  currentFurniture,
  roomDimensions,
  openings = [],
  roomType = 'Bedroom',
  compassRotation = 0,
  creditsState,
  onCreditsUpdated,
  onPreviewProposal,
  onAcceptProposal,
  onRejectProposal,
  activePreviewAction,
  onClose,
  className = ''
}) => {
  const [selectedTradition, setSelectedTradition] = useState<CulturalTradition>('vaastu_hindu')
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('interiorai_gemini_key') || '')
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey! What's going on?

I'm **Vaastu AI**. Tell me what you'd like to do with your space — ask me any questions about Vaastu or interior design, or tell me to move, rotate, add, or arrange furniture in your 3D room!`,
      timestamp: Date.now(),
      culturalContext: 'vaastu_hindu',
      isTraditionalGuidance: false
    }
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentTraditionMeta = CULTURAL_TRADITIONS.find(t => t.id === selectedTradition) || CULTURAL_TRADITIONS[0]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-focus input when opened
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    if (creditsState.isExhausted || creditsState.creditsRemaining <= 0) {
      setErrorMessage(`Daily AI credits limit reached. Credits reset at ${creditsState.resetTimeFormatted}.`)
      return
    }

    setErrorMessage(null)
    const userMsgId = `user_${Date.now()}`
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, newUserMsg])
    setInputMessage('')
    setIsLoading(true)

    // Build chat history for conversational context
    const historyPayload = messages.map(m => ({
      role: m.role,
      content: m.content,
      proposedAction: m.proposedAction
    }))

    try {
      const savedKey = localStorage.getItem('interiorai_gemini_key') || undefined
      const result = await sendVaastuChatMessage({
        message: text,
        currentFurniture,
        roomDimensions,
        openings,
        tradition: selectedTradition,
        roomType,
        compassRotation,
        history: historyPayload,
        // @ts-ignore
        geminiApiKey: savedKey
      })

      onCreditsUpdated({
        creditsRemaining: result.creditsRemaining,
        dailyAllowance: result.dailyAllowance,
        nextResetTimestamp: result.nextResetTimestamp,
        resetTimeFormatted: result.resetTimeFormatted,
        isExhausted: result.isExhausted
      })

      if (!result.success || !result.response) {
        setErrorMessage(result.error || 'Failed to receive a response from Vaastu AI')
        return
      }

      const assistantMsg: ChatMessage = {
        id: result.response.messageId,
        role: 'assistant',
        content: result.response.replyText,
        timestamp: Date.now(),
        culturalContext: result.response.culturalContextUsed,
        isTraditionalGuidance: result.response.isTraditionalGuidance,
        proposedAction: result.response.proposedAction,
        proposalStatus: result.response.proposedAction ? 'pending' : undefined
      }

      setMessages(prev => [...prev, assistantMsg])

      // Automatically engage preview if a layout change was proposed
      if (result.response.proposedAction) {
        onPreviewProposal(result.response.proposedAction)
      }

      // If the user confirmed with an affirmative message, commit the layout
      const isAffirmative = /^(yes|yeah|yup|sure|ok|okay|apply|accept|do it|looks good|commit|save it|perfect|go ahead|apply it)\b/i.test(text) ||
                            text.includes('apply this') || text.includes('apply changes') || text.includes('apply it') ||
                            text.includes('looks good') || text.includes('looks great')
      if (isAffirmative && activePreviewAction) {
        onAcceptProposal(activePreviewAction)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error communicating with Vaastu AI')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAcceptProposal = (msgId: string, action: VaastuProposedAction) => {
    onAcceptProposal(action)
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, proposalStatus: 'accepted' } : m))
    )
  }

  const handleRejectProposal = (msgId: string, action: VaastuProposedAction) => {
    onRejectProposal(action)
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, proposalStatus: 'rejected' } : m))
    )
  }

  const handleQuickAdjust = (nudgeText: string) => {
    handleSendMessage(nudgeText)
  }

  const suggestedPrompts = [
    { label: "What's going on?", text: "What's going on?" },
    { label: 'Move Bed to Southwest', text: 'Move the bed to the Southwest corner.' },
    { label: 'Where should mirror be?', text: 'Where should I place the mirror in this room according to Vaastu?' },
    { label: 'Add an Indoor Plant', text: 'Add an indoor plant in the Northeast.' },
    { label: 'Clear Center (Brahmasthan)', text: 'Clear the center of the room to keep the Brahmasthan open.' }
  ]

  return (
    <div className={`flex flex-col h-full bg-neutral-900 text-neutral-100 select-text ${className}`}>
      {/* ChatGPT-style Header */}
      <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white tracking-tight text-sm">Vaastu AI</h3>
                {/* Clean Credits Pill in header */}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-medium flex items-center gap-1" title="Daily AI Credits (Resets at 12:00 AM IST)">
                  <span>{creditsState.creditsRemaining}/{creditsState.dailyAllowance} credits</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">Thoughtful Spaces. Meaningful Living.</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeyModal(prev => !prev)}
              title="Configure Gemini API Key"
              className="p-1.5 text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800 rounded-lg transition"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setMessages([
                  {
                    id: `welcome_${Date.now()}`,
                    role: 'assistant',
                    content: `Hey! What's going on? How can I help you design or modify your 3D room?`,
                    timestamp: Date.now()
                  }
                ])
                onPreviewProposal(null)
                setErrorMessage(null)
              }}
              title="Clear Conversation"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                title="Close Assistant"
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Gemini API Key Configuration Drawer */}
        {showKeyModal && (
          <div className="bg-neutral-800/95 border border-neutral-700 rounded-xl p-2.5 text-xs text-neutral-200 animate-in fade-in duration-150 shadow-xl">
            <div className="flex items-center justify-between mb-1.5 font-medium text-emerald-300">
              <span className="flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                Google Gemini API Key
              </span>
              <button onClick={() => setShowKeyModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mb-2 leading-tight">
              Optional: Add your Gemini API key for enriched conversational reasoning. If left empty, Vaastu AI uses the local spatial reasoning engine automatically.
            </p>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  localStorage.setItem('interiorai_gemini_key', geminiKeyInput.trim())
                  setShowKeyModal(false)
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Tradition Selector */}
        <div className="flex items-center justify-between bg-neutral-800/70 border border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            Tradition:
          </span>
          <select
            value={selectedTradition}
            onChange={(e) => setSelectedTradition(e.target.value as CulturalTradition)}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            {CULTURAL_TRADITIONS.map(t => (
              <option key={t.id} value={t.id}>
                {t.shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ChatGPT Message History Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2.5 max-w-[92%]">
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : 'bg-neutral-800/95 text-neutral-200 border border-neutral-750 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Traditional Guideline Tag */}
                {msg.role === 'assistant' && msg.culturalContext && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 mb-1.5 border-b border-neutral-700/60 pb-1">
                    <Compass className="w-3 h-3" />
                    <span>
                      {CULTURAL_TRADITIONS.find(t => t.id === msg.culturalContext)?.shortLabel || 'Spatial Design'}
                    </span>
                    {msg.isTraditionalGuidance && (
                      <span className="ml-auto text-[9px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                        Traditional Guidelines
                      </span>
                    )}
                  </div>
                )}

                {msg.content}

                {/* Proposed 3D Action Card */}
                {msg.proposedAction && (
                  <div className="mt-3 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-3 text-neutral-200 shadow-inner">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                      <span className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                        Proposed 3D Modification
                      </span>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                        msg.proposedAction.validationStatus === 'passed'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}>
                        {msg.proposedAction.operation.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-300 mb-2">
                      {msg.proposedAction.reason}
                    </p>

                    {/* Validation Notes */}
                    {msg.proposedAction.validationNotes && msg.proposedAction.validationNotes.length > 0 && (
                      <div className="bg-neutral-800/60 rounded-lg p-2 mb-2.5 space-y-1">
                        {msg.proposedAction.validationNotes.map((note, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[10px] text-neutral-400">
                            {msg.proposedAction?.validationStatus === 'passed' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                            )}
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proposal Actions */}
                    {msg.proposalStatus === 'pending' ? (
                      <div className="flex flex-col gap-2 pt-1 border-t border-neutral-800">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onPreviewProposal(msg.proposedAction!)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition ${
                              activePreviewAction === msg.proposedAction
                                ? 'bg-emerald-500 text-neutral-950 font-semibold'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            {activePreviewAction === msg.proposedAction ? 'Preview Active' : 'Preview in 3D'}
                          </button>

                          <button
                            onClick={() => handleAcceptProposal(msg.id, msg.proposedAction!)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition shadow-sm"
                          >
                            <Check className="w-3 h-3" />
                            Accept Changes
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <button
                            onClick={() => handleRejectProposal(msg.id, msg.proposedAction!)}
                            className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-red-300 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900/50 transition flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject Proposal
                          </button>

                          <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                            <span>Adjust:</span>
                            <button
                              onClick={() => handleQuickAdjust('Move it a little left')}
                              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
                            >
                              ← Left
                            </button>
                            <button
                              onClick={() => handleQuickAdjust('Move it a little right')}
                              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
                            >
                              Right →
                            </button>
                            <button
                              onClick={() => handleQuickAdjust('Rotate it 90 degrees')}
                              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
                            >
                              ↻ 90°
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : msg.proposalStatus === 'accepted' ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Changes accepted and committed to 3D model.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-800/40 p-2 rounded-lg border border-neutral-800">
                        <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Proposal rejected. Previous layout preserved.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <span className="text-[10px] text-neutral-500 mt-1 px-9">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 p-3 bg-neutral-800/60 rounded-xl max-w-[75%] border border-neutral-750">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-neutral-400 ml-1">Vaastu AI is reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips (ChatGPT style) */}
      <div className="px-3.5 py-1.5 border-t border-neutral-800/80 bg-neutral-900/70">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          {suggestedPrompts.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.text)}
              disabled={isLoading || creditsState.isExhausted}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-300 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error or Exhaustion Banner */}
      {errorMessage && (
        <div className="px-4 py-2 bg-red-950/70 border-t border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {/* ChatGPT-style Input Container */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2 bg-neutral-800/90 border border-neutral-700 focus-within:border-emerald-500/80 rounded-2xl px-3 py-1.5 transition-all shadow-inner"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || creditsState.isExhausted}
            placeholder={
              creditsState.isExhausted
                ? `Limit reached. Resets at ${creditsState.resetTimeFormatted}`
                : `Message Vaastu AI (e.g. "Move bed to Southwest")...`
            }
            className="flex-1 bg-transparent border-0 resize-none text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none max-h-24 disabled:opacity-50 py-1.5"
          />

          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim() || creditsState.isExhausted}
            className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center font-bold transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-sm active:scale-95"
            title="Send Message"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-neutral-500">
          <span>{currentTraditionMeta.shortLabel}</span>
          <span>Vaastu AI provides cultural design guidance.</span>
        </div>
      </div>
    </div>
  )
}
