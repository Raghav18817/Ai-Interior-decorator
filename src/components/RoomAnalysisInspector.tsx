import { useState } from 'react'
import { RoomAnalysisResult, DetectedObject } from '../types/analysis'
import { UploadedImage } from '../types/project'
import { runImageAnalysisPipeline } from '../services/imageAnalysisPipeline'
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  DoorOpen, 
  Maximize2, 
  Box, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Info
} from 'lucide-react'

interface RoomAnalysisInspectorProps {
  images: UploadedImage[]
  projectRoomType?: string
  analysisResult?: RoomAnalysisResult
  onAnalysisComplete: (result: RoomAnalysisResult) => void
}

export function RoomAnalysisInspector({
  images,
  projectRoomType,
  analysisResult,
  onAnalysisComplete
}: RoomAnalysisInspectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStage, setCurrentStage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showOverlays, setShowOverlays] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'furniture' | 'openings' | 'surfaces'>('all')

  const readyImages = images.filter((i) => i.status === 'ready' && i.dataUrl)

  const handleStartAnalysis = async () => {
    if (readyImages.length === 0) {
      setErrorMessage('Please upload and wait for at least one room photo to finish loading before analyzing.')
      return
    }

    setIsAnalyzing(true)
    setErrorMessage(null)

    try {
      const result = await runImageAnalysisPipeline(
        readyImages,
        projectRoomType,
        (stage) => setCurrentStage(stage)
      )
      onAnalysisComplete(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during image analysis.'
      setErrorMessage(msg)
    } finally {
      setIsAnalyzing(false)
      setCurrentStage('')
    }
  }

  // Combine objects for rendering
  const allObjects: DetectedObject[] = analysisResult
    ? [...analysisResult.doors, ...analysisResult.windows, ...analysisResult.furniture, ...analysisResult.appliances, ...analysisResult.majorObjects]
    : []

  const filteredObjects = allObjects.filter((obj) => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'furniture') return obj.category === 'furniture' || obj.category === 'fixture'
    if (selectedCategory === 'openings') return obj.category === 'door' || obj.category === 'window'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Action Header / Analysis Trigger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white">Computer Vision Analysis Pipeline</h2>
            {analysisResult && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Analyzed</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detects walls, floors, apertures, and objects to generate structured geometry.
          </p>
        </div>

        <button
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || readyImages.length === 0}
          className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
            isAnalyzing || readyImages.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20 active:scale-95'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Pixels...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{analysisResult ? 'Re-Analyze Photographs' : 'Analyze Room Photos'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Processing Animation / Progress */}
      {isAnalyzing && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-semibold text-white">Running Vision Pipeline:</span>
            <span className="text-sm text-emerald-400 font-mono">{currentStage}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Analysis Output Section */}
      {analysisResult && !isAnalyzing && (
        <div className="space-y-6">
          {/* Dimensional Uncertainty Disclosure */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300/90 leading-relaxed">
              <span className="font-semibold text-amber-300">Geometric Certainty Notice: </span>
              Spatial dimensions are estimated from 2D photographic perspective with an estimated uncertainty margin of &plusmn;{analysisResult.dimensions.uncertaintyMarginMeters}m.
              {analysisResult.hasUncertainGeometry && (
                <span className="block mt-1 text-amber-400 font-medium">
                  Notice: Unseen rear boundary is estimated based on standard architectural ratios. Uploading opposite-corner photos refines geometry.
                </span>
              )}
            </div>
          </div>

          {/* Metric Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5 mb-1">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estimated Footprint</span>
              </div>
              <div className="text-xl font-bold text-white">
                {analysisResult.dimensions.lengthMeters}m &times; {analysisResult.dimensions.widthMeters}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Area: {((Number(analysisResult.dimensions.lengthMeters) || 0) * (Number(analysisResult.dimensions.widthMeters) || 0)).toFixed(1)} m&sup2;
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Ceiling Clearance</span>
              </div>
              <div className="text-xl font-bold text-white">
                {analysisResult.dimensions.heightMeters}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Vertical span
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5 mb-1">
                <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Openings Detected</span>
              </div>
              <div className="text-xl font-bold text-white">
                {analysisResult.doors.length + analysisResult.windows.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {analysisResult.doors.length} Door &bull; {analysisResult.windows.length} Window
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5 mb-1">
                <Box className="w-3.5 h-3.5 text-indigo-400" />
                <span>Objects Identified</span>
              </div>
              <div className="text-xl font-bold text-white">
                {analysisResult.furniture.length + analysisResult.appliances.length + analysisResult.majorObjects.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Confidence: {Math.round(analysisResult.confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Visual Overlay Preview */}
          {readyImages.length > 0 && readyImages[0].dataUrl && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Computer Vision Detection Overlay
                  </h3>
                  <span className="text-xs text-slate-400">Primary Photographic Feed</span>
                </div>
                <button
                  onClick={() => setShowOverlays(!showOverlays)}
                  className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {showOverlays ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showOverlays ? 'Hide 2D Bounding Boxes' : 'Show 2D Bounding Boxes'}</span>
                </button>
              </div>

              <div className="relative aspect-video max-w-3xl mx-auto rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={readyImages[0].dataUrl}
                  alt="Room Analysis View"
                  className="w-full h-full object-contain"
                />

                {/* Render Detection Bounding Box Overlays */}
                {showOverlays && (
                  <div className="absolute inset-0 pointer-events-none">
                    {allObjects.map((obj) => {
                      if (!obj.boundingBox) return null
                      const { x, y, width, height } = obj.boundingBox
                      return (
                        <div
                          key={obj.id}
                          className="absolute border-2 border-emerald-400/90 bg-emerald-500/10 flex flex-col justify-between p-1 transition-all"
                          style={{
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            width: `${width * 100}%`,
                            height: `${height * 100}%`
                          }}
                        >
                          <span className="text-[10px] font-bold bg-slate-900/90 text-emerald-400 px-1 py-0.5 rounded shadow w-max border border-emerald-500/30">
                            {obj.label} ({Math.round(obj.confidence * 100)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Structured Object & Surface Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Detected Structural & Interior Elements ({filteredObjects.length})
              </h3>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  All ({allObjects.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('furniture')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedCategory === 'furniture'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  Furniture & Fixtures ({analysisResult.furniture.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('openings')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedCategory === 'openings'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  Doors & Windows ({analysisResult.doors.length + analysisResult.windows.length})
                </button>
              </div>
            </div>

            {/* Elements Table / Grid */}
            <div className="divide-y divide-slate-800/80">
              {filteredObjects.map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{item.label}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span className="text-emerald-400 font-mono">
                        {Math.round(item.confidence * 100)}% match
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-slate-400 font-mono shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Est. Dimensions (W&times;H&times;D)</span>
                      <span className="text-slate-200">
                        {item.estimatedDimensions.widthMeters}m &times; {item.estimatedDimensions.heightMeters}m &times; {item.estimatedDimensions.depthMeters}m
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Wall Alignment</span>
                      <span className="text-emerald-400 capitalize">{item.relativePosition.wallAlignment}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
