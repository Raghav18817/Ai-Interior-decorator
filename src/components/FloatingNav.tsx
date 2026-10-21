import { Home, Layers, BookOpen, Sparkles, LogOut, User as UserIcon } from 'lucide-react'
import { AuthUser } from '../types/auth'

interface FloatingNavProps {
  currentView: 'dashboard' | 'projects' | 'guide'
  onSelectView: (view: 'dashboard' | 'projects' | 'guide') => void
  onTryForFree: () => void
  currentUser: AuthUser | null
  onLogout: () => void
  projectsCount?: number
}

export function FloatingNav({
  currentView,
  onSelectView,
  onTryForFree,
  currentUser,
  onLogout,
  projectsCount = 0
}: FloatingNavProps) {
  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 max-w-7xl mx-auto w-full transition-all">
      <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: DECOME Brand & Tagline */}
        <div 
          onClick={() => onSelectView('dashboard')}
          className="flex items-center space-x-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-emerald-500/10">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                DECOME
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AI 3D
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight -mt-0.5 hidden sm:block">
              decorate your home with us
            </p>
          </div>
        </div>

        {/* Center: Innovative Floating Pill Frame Navigation */}
        <nav className="bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex items-center space-x-1 shadow-inner">
          <button
            onClick={() => onSelectView('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'dashboard'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectView('projects')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'projects'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Projects</span>
            {projectsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentView === 'projects' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
              }`}>
                {projectsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('guide')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'guide'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Platform</span>
            <span>Guide</span>
          </button>
        </nav>

        {/* Right: User Profile & 'Try for free' Action */}
        <div className="flex items-center space-x-2 shrink-0">
          {currentUser && (
            <div className="flex items-center space-x-2 pl-1 pr-2 py-1 rounded-xl bg-slate-950/60 border border-slate-800 hidden md:flex">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-emerald-500/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-300 truncate max-w-[100px]">
                {currentUser.name}
              </span>
              <button
                onClick={onLogout}
                title="Sign out"
                className="text-slate-500 hover:text-red-400 transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Prominent 'Try for free' button */}
          <button
            onClick={onTryForFree}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>Try for free</span>
          </button>
        </div>
      </div>
    </header>
  )
}
