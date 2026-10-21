import { Project } from '../types/project'
import { 
  FolderPlus, 
  Trash2, 
  ArrowRight, 
  DoorOpen, 
  Home, 
  Calendar, 
  Sparkles
} from 'lucide-react'

interface ProjectListProps {
  projects: Project[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onOpenCreateModal: () => void
}

export function ProjectList({
  projects,
  activeProjectId,
  onSelectProject,
  onDeleteProject,
  onOpenCreateModal
}: ProjectListProps) {

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. TOP HERO: A Complete 3D model of house from a photo and furnish it according to u */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spatial 3D Home Reconstruction</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              A Complete 3D model of house from a photo and furnish it according to u
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Transform any uploaded room photo into an interactive 3D walkthrough with photorealistic textures, true architectural proportions, and customized furniture arrangements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center space-x-2 whitespace-nowrap"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create New 3D Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. USER'S SAVED DESIGN PROJECTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <span>Your Active Design Projects</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                {projects.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Select any project to inspect, manipulate in 3D, or book on-site execution
            </p>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Start New Design</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">No Design Projects Saved Yet</h4>
            <p className="text-xs text-slate-400">
              Upload room photos to create your first 3D reconstruction, or explore executed showcase projects below.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow transition-all"
            >
              <span>Create First Room Design &rarr;</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId
              const formattedDate = new Date(project.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`group relative rounded-2xl border p-5 flex flex-col justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xl'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {project.scope === 'complete_house' ? (
                          <>
                            <Home className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Complete House</span>
                          </>
                        ) : (
                          <>
                            <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{project.roomType || 'Room'}</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Delete project "${project.name}"?`)) {
                            onDeleteProject(project.id)
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {project.name}
                    </h4>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </div>
                      <div>
                        {project.images?.length || 0} photo{project.images?.length !== 1 ? 's' : ''}
                      </div>
                      <div>
                        {project.furniture?.length || 0} items
                      </div>
                    </div>
                  </div>

                  {/* Card Actions: Open 3D */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                    <div className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      <span>Open 3D Model</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
