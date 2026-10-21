import { useState, useEffect } from 'react'
import { 
  Layers, 
  Box, 
  Sparkles, 
  DoorOpen,
  Compass,
  CheckCircle2
} from 'lucide-react'
import { Project } from './types/project'
import { AuthUser } from './types/auth'
import { getCurrentUser, logoutUser, fetchDatabaseSession } from './services/authService'
import { projectStorage } from './services/projectStorage'
import { ProjectModal } from './components/ProjectModal'
import { ProjectList } from './components/ProjectList'
import { ProjectWorkspace } from './components/ProjectWorkspace'
import { FloatingNav } from './components/FloatingNav'
import { AuthModal } from './components/AuthModal'
import { LuxuryEstate3DBackground } from './components/LuxuryEstate3DBackground'
import { SupplierBookingModal } from './components/SupplierBookingModal'

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser())
  const [currentNav, setCurrentNav] = useState<'dashboard' | 'projects' | 'guide'>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Sync session and projects with central server database (works across any device)
  useEffect(() => {
    fetchDatabaseSession().then(dbUser => {
      if (dbUser) {
        setCurrentUser(dbUser)
      }
    })

    const loaded = projectStorage.getProjects()
    setProjects(loaded)
    const savedActiveId = projectStorage.getActiveProjectId()
    if (savedActiveId && loaded.some(p => p.id === savedActiveId)) {
      setActiveProjectId(savedActiveId)
    }

    projectStorage.fetchRemoteProjects().then(remoteProjects => {
      if (remoteProjects && remoteProjects.length > 0) {
        setProjects(remoteProjects)
      }
    })
  }, [])

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user)
  }

  const handleLogout = async () => {
    await logoutUser()
    setCurrentUser(null)
  }

  const handleCreateProject = (newProject: Project) => {
    projectStorage.addProject(newProject)
    const updated = projectStorage.getProjects()
    setProjects(updated)
    setActiveProjectId(newProject.id)
    projectStorage.setActiveProjectId(newProject.id)
    setCurrentNav('projects')
  }

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id)
    projectStorage.setActiveProjectId(id)
    setCurrentNav('projects')
  }

  const handleDeleteProject = (id: string) => {
    projectStorage.deleteProject(id)
    const updated = projectStorage.getProjects()
    setProjects(updated)
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }
  }

  const handleUpdateProject = (updated: Project) => {
    projectStorage.addProject(updated)
    const list = projectStorage.getProjects()
    setProjects(list)
  }

  const activeProject = projects.find(p => p.id === activeProjectId) || null

  // ------------------------------------------------------------------
  // 1. UN-AUTHENTICATED 3D LUXURY HOME & AUTHENTICATION EXPERIENCE
  // ------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center overflow-hidden font-sans select-none">
        {/* Full-Screen 3D Interactive Luxury Villa in Background */}
        <div className="absolute inset-0 z-0">
          <LuxuryEstate3DBackground interactive={false} />
        </div>

        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/30 pointer-events-none z-10" />

        {/* Floating Glassmorphic Authentication Card */}
        <div className="relative z-20 w-full px-4 flex items-center justify-center pointer-events-auto">
          <AuthModal
            onSuccess={handleLoginSuccess}
          />
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // 2. AUTHENTICATED DECOME PLATFORM
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Innovative Floating Glassmorphic Header */}
      <FloatingNav
        currentView={currentNav}
        onSelectView={(v) => {
          setCurrentNav(v)
          if (v === 'dashboard') setActiveProjectId(null)
        }}
        onTryForFree={() => setIsModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        projectsCount={projects.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentNav === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in">
            {/* HERO BANNER WITH IMMERSIVE 3D LUXURY HOME & PANORAMIC ESTATE */}
            <div className="relative rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl bg-slate-950 min-h-[460px] flex flex-col justify-center">
              {/* Full Background 3D Luxury Villa */}
              <div className="absolute inset-0 z-0">
                <LuxuryEstate3DBackground interactive={false} />
              </div>

              {/* Gradient Scrim for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent pointer-events-none z-10" />

              {/* Content Overlay */}
              <div className="relative z-20 p-8 sm:p-12 max-w-2xl space-y-4 pointer-events-auto">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>DECOME Precision Spatial AI</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                  A Complete 3D model of house from a photo and <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">furnish it according to u</span>
                </h1>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/30 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Try for free</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core Capability Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Box className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Photorealistic 3D Room</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Hardwood floor planks, plaster walls, baseboards, and realistic outdoor sky vistas through window apertures.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Real Geometry</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20">
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Connected Doorway Portals</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Adjacent rooms connected through physical doors. Step through or click to fly between Living Room, Bedroom & Kitchen.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Multi-Room Walkthrough</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Street View Walkthrough</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Explore any room at 1.65m human eye level. Click anywhere on the floor to glide forward and pan 360° around your furnished interior.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-sky-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Maps Style</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Natural-Language AI</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Speak or type commands like "Move sofa near window" or "Put TV opposite sofa" to re-calculate 3D layout.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conversational Assistant</span>
                </div>
              </div>
            </div>

            {/* Quick Access to Projects */}
            <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base font-bold text-white">Ready to design your room or explore executed homes?</h4>
                <p className="text-xs text-slate-400">Manage your active projects or book physical measurements directly.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentNav('projects')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center space-x-2"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>View All Projects ({projects.length})</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
                >
                  <span>Try for free &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS SECTION */}
        {currentNav === 'projects' && (
          <div>
            {activeProject ? (
              <ProjectWorkspace
                project={activeProject}
                onUpdateProject={handleUpdateProject}
                onBack={() => setActiveProjectId(null)}
              />
            ) : (
              <ProjectList
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={handleSelectProject}
                onDeleteProject={handleDeleteProject}
                onOpenCreateModal={() => setIsModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* PLATFORM GUIDE SECTION */}
        {currentNav === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black text-white">DECOME Platform Architecture</h2>
              <p className="text-sm text-slate-400">decorate your home with us &bull; Complete Spatial Workflow Guide</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">1</div>
                <h4 className="text-sm font-bold text-white">Photo CV Extraction</h4>
                <p className="text-xs text-slate-400">Extracts room perimeter, ceiling height, doorways, windows, and anti-hallucination verified electrical points.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">2</div>
                <h4 className="text-sm font-bold text-white">Photorealistic 3D Model</h4>
                <p className="text-xs text-slate-400">Real wood plank floors, baseboards, cove lighting, and connected doorways into adjacent bedrooms and kitchens.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">3</div>
                <h4 className="text-sm font-bold text-white">3D Walkthrough & Custom Furnishing</h4>
                <p className="text-xs text-slate-400">Step inside your virtual home at 1.65m human eye level, customize furniture to your liking, and explore connected rooms.</p>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white">Ready to furnish your home in 3D?</h4>
                <p className="text-xs sm:text-sm text-slate-300">Upload photos of your room to generate a first-person 3D model and customize your furniture layout.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Start Free 3D Project</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white">DECOME</span>
            <span>&bull;</span>
            <span>decorate your home with us</span>
            <span>&bull;</span>
            <span>AI 3D Interior & Spatial Reconstruction</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-emerald-400">Neufert & IBC Standards</span>
            <span>&bull;</span>
            <span>First-Person 3D Walkthrough</span>
          </div>
        </div>
      </footer>

      {/* New Project / Try for free Creation Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleCreateProject}
      />

      {/* Measurement Booking Modal */}
      <SupplierBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  )
}

export default App
