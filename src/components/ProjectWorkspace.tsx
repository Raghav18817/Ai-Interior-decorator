import { useState, useMemo, useEffect } from 'react'
import { Project, UploadedImage } from '../types/project'
import { RoomAnalysisResult } from '../types/analysis'
import { FurnitureItem } from '../types/furniture'
import { ImageUploadArea } from './ImageUploadArea'
import { RoomAnalysisInspector } from './RoomAnalysisInspector'
import { ThreeRoomViewer } from './ThreeRoomViewer'
import { FurnitureRecommendationPanel } from './FurnitureRecommendationPanel'
import { DevicePlacementPanel } from './DevicePlacementPanel'
import { SpaceOptimizationPanel } from './SpaceOptimizationPanel'
import { ChangeValidationInspector } from './ChangeValidationInspector'
import { UserApprovalPanel } from './UserApprovalPanel'
import { SaveRestoreBar } from './SaveRestoreBar'
import { VaastuChatPanel } from './VaastuChatPanel'
import { buildRoom3DModel } from '../services/reconstructionEngine'
import { convertAnalysisToFurnitureItems } from '../services/furnitureService'
import { createRevisionSnapshot } from '../services/approvalService'
import { LayoutRevisionSnapshot } from '../types/approval'
import { AICreditsState, fetchAICredits } from '../services/vaastuService'
import { VaastuProposedAction } from '../services/vaastu3DEngine'
import { 
  ArrowLeft, 
  DoorOpen, 
  Home, 
  Calendar, 
  Box, 
  Sparkles, 
  Image as ImageIcon, 
  Compass, 
  Layers
} from 'lucide-react'

interface ProjectWorkspaceProps {
  project: Project
  onBack: () => void
  onUpdateProject: (updated: Project) => void
}

export function ProjectWorkspace({ project, onBack, onUpdateProject }: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'analysis' | '3d' | 'recommendations' | 'devices' | 'optimization' | 'validation' | 'approval'>(() => {
    return (project.images && project.images.length > 0) ? '3d' : 'photos'
  })
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [activePreviewAction, setActivePreviewAction] = useState<VaastuProposedAction | null>(null)
  const [creditsState, setCreditsState] = useState<AICreditsState>({
    creditsRemaining: 10,
    dailyAllowance: 10,
    nextResetTimestamp: Date.now() + 86400000,
    resetTimeFormatted: '12:00 AM IST',
    isExhausted: false
  })

  useEffect(() => {
    fetchAICredits().then(setCreditsState)
  }, [])
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => 
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )

  const formattedDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const currentImages = project.images || []
  const readyImagesCount = currentImages.filter(i => i.status === 'ready').length

  const room3DModel = useMemo(() => {
    const base = buildRoom3DModel(project.analysisResult)
    if (project.dimensionConfirmation?.confirmedByUser) {
      return {
        ...base,
        dimensions: {
          ...base.dimensions,
          length: project.dimensionConfirmation.calibratedLength ?? base.dimensions.length,
          width: project.dimensionConfirmation.calibratedWidth ?? base.dimensions.width,
          height: project.dimensionConfirmation.calibratedHeight ?? base.dimensions.height,
          isEstimated: false
        }
      }
    }
    return base
  }, [project.analysisResult, project.dimensionConfirmation])

  // Get active furniture items or initialize from analysis if empty
  const currentFurniture = useMemo(() => {
    if (project.furniture && project.furniture.length > 0) {
      return project.furniture
    }
    if (project.analysisResult) {
      return convertAnalysisToFurnitureItems(project.analysisResult, project.roomType || 'Living Room')
    }
    return []
  }, [project.furniture, project.analysisResult, project.roomType])

  const handleImagesChange = (updatedImages: UploadedImage[]) => {
    const updatedProject: Project = {
      ...project,
      images: updatedImages,
      updatedAt: new Date().toISOString()
    }
    onUpdateProject(updatedProject)
  }

  const handleAnalysisComplete = (result: RoomAnalysisResult) => {
    const initialFurniture = convertAnalysisToFurnitureItems(result, project.roomType || 'Living Room')
    const updatedProject: Project = {
      ...project,
      analysisResult: result,
      furniture: initialFurniture,
      updatedAt: new Date().toISOString()
    }
    onUpdateProject(updatedProject)
    setActiveTab('3d')
  }

  const [pendingProposal, setPendingProposal] = useState<FurnitureItem[] | null>(null)
  const [revisionHistory, setRevisionHistory] = useState<LayoutRevisionSnapshot[]>(() => {
    return [createRevisionSnapshot('Baseline Initial Layout', currentFurniture)]
  })

  const handleUpdateFurniture = (newFurniture: FurnitureItem[]) => {
    const updatedProject: Project = {
      ...project,
      furniture: newFurniture,
      updatedAt: new Date().toISOString()
    }
    onUpdateProject(updatedProject)
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }

  const handleManualSave = () => {
    onUpdateProject({ ...project, updatedAt: new Date().toISOString() })
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }

  const handleImportProject = (imported: Project) => {
    onUpdateProject(imported)
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    if (imported.furniture && imported.furniture.length > 0) {
      setActiveTab('3d')
    }
  }

  const handleAddFurnitureToScene = (item: FurnitureItem) => {
    const updatedList = [...currentFurniture, item]
    const snap = createRevisionSnapshot(`Added ${item.name}`, updatedList)
    setRevisionHistory(prev => [...prev, snap])
    handleUpdateFurniture(updatedList)
    setActiveTab('3d')
  }

  const handleAcceptOptimization = (optimizedFurniture: FurnitureItem[]) => {
    const snap = createRevisionSnapshot('Optimization Proposal Applied', optimizedFurniture)
    setRevisionHistory(prev => [...prev, snap])
    handleUpdateFurniture(optimizedFurniture)
    setPendingProposal(null)
    setActiveTab('3d')
  }

  const handleApplyApprovedChanges = (approved: FurnitureItem[], description: string) => {
    const snap = createRevisionSnapshot(description, approved)
    setRevisionHistory(prev => [...prev, snap])
    handleUpdateFurniture(approved)
    setPendingProposal(null)
    setActiveTab('3d')
  }

  const handleRevertToSnapshot = (snap: LayoutRevisionSnapshot) => {
    handleUpdateFurniture(snap.furniture)
    setPendingProposal(null)
    setActiveTab('3d')
  }

  const handleAcceptVaastuProposal = (action: VaastuProposedAction) => {
    const snap = createRevisionSnapshot(`Vaastu.ai: ${action.reason}`, action.proposedLayout)
    setRevisionHistory(prev => [...prev, snap])
    handleUpdateFurniture(action.proposedLayout)
    setActivePreviewAction(null)
  }

  const handleRejectVaastuProposal = (_action: VaastuProposedAction) => {
    setActivePreviewAction(null)
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{project.name}</h1>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {project.scope === 'complete_house' ? 'Complete House' : project.roomType}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created {formattedDate}</span>
              </span>
              <span>&bull;</span>
              <span>Project ID: <code className="text-slate-300 font-mono">{project.id}</code></span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === '3d'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Walkthrough & Decor</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'photos'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos ({currentImages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('optimization')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'optimization'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layout Optimizer</span>
          </button>
        </div>
      </div>

      {/* Save, Versioned Export & Import Design Bar */}
      <SaveRestoreBar
        project={project}
        onSaveManual={handleManualSave}
        onImportProject={handleImportProject}
        lastSavedTime={lastSavedTime}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'photos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    {project.scope === 'complete_house' ? <Home className="w-5 h-5" /> : <DoorOpen className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Room Photography Upload</h2>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Upload multi-angle photos of {project.scope === 'complete_house' ? 'all rooms' : `the ${project.roomType}`} for 3D reconstruction.
                    </p>
                  </div>
                </div>

                {readyImagesCount > 0 && (
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                  >
                    <span>Proceed to Analysis &rarr;</span>
                  </button>
                )}
              </div>

              {/* Image Upload Area */}
              <ImageUploadArea
                images={currentImages}
                onImagesChange={handleImagesChange}
                onStartReconstruction={() => {
                  setActiveTab('3d')
                }}
                reconstructionStatus={project.worldLabsViewerUrl ? 'ready' : (project.worldLabsStatus || 'idle')}
              />
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <RoomAnalysisInspector
                images={currentImages}
                projectRoomType={project.roomType}
                analysisResult={project.analysisResult}
                onAnalysisComplete={handleAnalysisComplete}
              />

              {project.analysisResult && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>View AI Recommendations</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('3d')}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <Box className="w-4 h-4" />
                    <span>View 3D Scene &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === '3d' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Box className="w-5 h-5 text-emerald-400" />
                      <span>Interactive 3D Furniture & Space Environment</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Select furniture or electronics to inspect dimensions, rotate 90&deg;, and nudge positions.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveTab('optimization')}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Optimize Space Layout &rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Real Three.js 3D Viewer with Furniture Representation */}
                <ThreeRoomViewer 
                  model={room3DModel} 
                  furnitureItems={activePreviewAction?.proposedLayout || currentFurniture}
                  highlightFurnitureId={activePreviewAction?.objectId}
                  onUpdateFurniture={handleUpdateFurniture}
                  images={currentImages}
                  roomType={project.roomType}
                  worldLabsWorldId={project.worldLabsWorldId}
                  worldLabsViewerUrl={project.worldLabsViewerUrl}
                  worldLabsAssets={project.worldLabsAssets}
                  dimensionConfirmation={project.dimensionConfirmation}
                  onUpdateWorldLabsData={(worldId, viewerUrl, assets) => {
                    onUpdateProject({
                      ...project,
                      worldLabsWorldId: worldId,
                      worldLabsViewerUrl: viewerUrl,
                      worldLabsStatus: 'ready',
                      worldLabsAssets: assets || project.worldLabsAssets,
                      updatedAt: new Date().toISOString()
                    })
                  }}
                  onUpdateDimensions={(dims) => {
                    onUpdateProject({
                      ...project,
                      dimensionConfirmation: dims,
                      updatedAt: new Date().toISOString()
                    })
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <FurnitureRecommendationPanel
              roomType={project.roomType || 'Living Room'}
              roomDimensions={{
                length: room3DModel.dimensions.length,
                width: room3DModel.dimensions.width,
                height: room3DModel.dimensions.height
              }}
              existingFurniture={currentFurniture}
              onAddFurnitureToScene={handleAddFurnitureToScene}
            />
          )}

          {activeTab === 'devices' && (
            <DevicePlacementPanel
              roomDimensions={{
                length: room3DModel.dimensions.length,
                width: room3DModel.dimensions.width,
                height: room3DModel.dimensions.height
              }}
              furniture={currentFurniture}
              openings={room3DModel.openings}
              onAddDeviceToScene={handleAddFurnitureToScene}
            />
          )}

          {activeTab === 'optimization' && (
            <SpaceOptimizationPanel
              furniture={currentFurniture}
              roomDimensions={{
                length: room3DModel.dimensions.length,
                width: room3DModel.dimensions.width,
                height: room3DModel.dimensions.height
              }}
              openings={room3DModel.openings}
              onAcceptProposal={handleAcceptOptimization}
            />
          )}

          {activeTab === 'validation' && (
            <ChangeValidationInspector
              furniture={currentFurniture}
              roomDimensions={{
                length: room3DModel.dimensions.length,
                width: room3DModel.dimensions.width,
                height: room3DModel.dimensions.height
              }}
              openings={room3DModel.openings}
              onApplyAutoFix={handleUpdateFurniture}
            />
          )}

          {activeTab === 'approval' && (
            <UserApprovalPanel
              currentFurniture={currentFurniture}
              proposedFurniture={pendingProposal}
              revisionHistory={revisionHistory}
              onApplyChanges={handleApplyApprovedChanges}
              onDiscardProposal={() => setPendingProposal(null)}
              onRevertToSnapshot={handleRevertToSnapshot}
            />
          )}
        </div>

        {/* Right Column: Project Meta Info & Next Loop Readiness */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Project Status</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Design Scope</span>
                <span className="font-medium text-white capitalize">{project.scope.replace('_', ' ')}</span>
              </div>
              {project.roomType && (
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Room Category</span>
                  <span className="font-medium text-emerald-400">{project.roomType}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Uploaded Photos</span>
                <span className="font-medium text-white">{currentImages.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Active Furniture</span>
                <span className="font-medium text-white font-mono">{currentFurniture.length} items</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Space Optimization</span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Non-Destructive Proposals
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Natural-Language Assistant</span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Active & Ready
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Feasibility & Code Check</span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Multi-Point Validator
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">User Approval & History</span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {revisionHistory.length} Revisions Saved
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Design Persistence</span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  JSON Bundle & V2 Storage
                </span>
              </div>
            </div>
          </div>

          {/* Space Optimization Principles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold">
              <Layers className="w-4 h-4" />
              <span>Optimization Principles</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span>Proposals NEVER automatically overwrite your current design.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span>Inspect full Before vs. After comparison with explicit change logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span>Every change is collision-checked and boundary-clamped.</span>
              </li>
              <li className="flex items-start gap-2 text-emerald-400">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span>Accept button commits changes; Reject restores current layout.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right Vaastu AI Assistant Launcher & Modal */}
      <aside aria-label="Vaastu AI Assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
        {isAssistantOpen ? (
          <div className="w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)] rounded-2xl shadow-2xl shadow-black/60 border border-slate-800 overflow-hidden flex flex-col bg-slate-900/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <VaastuChatPanel
              currentFurniture={currentFurniture}
              roomDimensions={{
                length: room3DModel.dimensions.length,
                width: room3DModel.dimensions.width,
                height: room3DModel.dimensions.height
              }}
              openings={room3DModel.openings}
              roomType={project.roomType || 'Living Room'}
              creditsState={creditsState}
              onCreditsUpdated={setCreditsState}
              onPreviewProposal={(action: VaastuProposedAction | null) => {
                setActivePreviewAction(action)
                if (action && activeTab !== '3d') setActiveTab('3d')
              }}
              onAcceptProposal={handleAcceptVaastuProposal}
              onRejectProposal={handleRejectVaastuProposal}
              activePreviewAction={activePreviewAction}
              onClose={() => setIsAssistantOpen(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 group">
            {/* Name on top of circle */}
            <div className="px-2.5 py-1 rounded-full bg-slate-900/95 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 shadow-lg shadow-black/40 flex items-center space-x-1.5 backdrop-blur-md transition-transform group-hover:-translate-y-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Vaastu AI</span>
            </div>

            {/* Circular trigger button */}
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20"
              aria-label="Open Vaastu AI Assistant"
              title="Open Vaastu AI Assistant"
            >
              <Sparkles className="w-6 h-6 text-slate-950 transition-transform group-hover:rotate-12" />
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
