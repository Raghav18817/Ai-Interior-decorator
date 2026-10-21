import { useState } from 'react'
import { Project, ProjectScope, RoomType, ROOM_TYPES } from '../types/project'
import { X, Home, DoorOpen, AlertCircle, Check } from 'lucide-react'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: Project) => void
}

export function ProjectModal({ isOpen, onClose, onProjectCreated }: ProjectModalProps) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<ProjectScope>('individual_room')
  const [roomType, setRoomType] = useState<RoomType>('Living Room')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMessage('Project name is required.')
      return
    }

    if (trimmedName.length < 2) {
      setErrorMessage('Project name must be at least 2 characters.')
      return
    }

    if (scope === 'individual_room' && !roomType) {
      setErrorMessage('Please select a valid room type.')
      return
    }

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      scope,
      roomType: scope === 'individual_room' ? roomType : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onProjectCreated(newProject)
    handleClose()
  }

  const handleClose = () => {
    setName('')
    setScope('individual_room')
    setRoomType('Living Room')
    setErrorMessage(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            Create Design Project
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Project Name Input */}
          <div className="space-y-2">
            <label htmlFor="projectName" className="block text-sm font-medium text-slate-200">
              Project Name <span className="text-emerald-400">*</span>
            </label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder="e.g. Modern Sunset Living Space"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm transition-colors"
              autoFocus
            />
          </div>

          {/* Project Scope Selection: Complete House vs Individual Room */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Project Scope <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('individual_room')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  scope === 'individual_room'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <DoorOpen className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Individual Room</span>
                <span className="text-xs text-slate-400 mt-0.5">Single space design</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('complete_house')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  scope === 'complete_house'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <Home className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Complete House</span>
                <span className="text-xs text-slate-400 mt-0.5">Multi-room layout</span>
              </button>
            </div>
          </div>

          {/* Room Type Selection (only applicable for individual room) */}
          {scope === 'individual_room' && (
            <div className="space-y-2">
              <label htmlFor="roomType" className="block text-sm font-medium text-slate-200">
                Room Type <span className="text-emerald-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROOM_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRoomType(type)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      roomType === type
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{type}</span>
                    {roomType === type && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
