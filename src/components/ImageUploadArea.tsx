import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react'
import { UploadedImage } from '../types/project'
import { 
  validateImageFile, 
  processFileWithProgress, 
  formatFileSize,
  SUPPORTED_MIME_TYPES 
} from '../services/imageService'
import { 
  UploadCloud, 
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  Plus,
  Camera,
  Sparkles
} from 'lucide-react'

interface ImageUploadAreaProps {
  images: UploadedImage[]
  onImagesChange: (updatedImages: UploadedImage[]) => void
  onStartReconstruction?: () => void
  reconstructionStatus?: 'idle' | 'preparing' | 'generating' | 'ready' | 'error'
}

export function ImageUploadArea({ 
  images, 
  onImagesChange, 
  onStartReconstruction,
  reconstructionStatus = 'idle'
}: ImageUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Keep a ref of current images for asynchronous callbacks
  const imagesRef = useRef<UploadedImage[]>(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])

  // Store raw files in ref for retry capability
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
      // Reset input value so same files can be re-selected if needed
      e.target.value = ''
    }
  }

  const handleFiles = (incomingFiles: File[]) => {
    const errors: string[] = []
    const validQueue: { file: File; imageEntry: UploadedImage }[] = []

    incomingFiles.forEach((file) => {
      const val = validateImageFile(file)
      if (!val.valid) {
        errors.push(val.error || `Invalid file ${file.name}`)
      } else {
        const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const imageEntry: UploadedImage = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: '',
          uploadedAt: new Date().toISOString(),
          status: 'uploading',
          progress: 10
        }
        pendingFilesRef.current.set(id, file)
        validQueue.push({ file, imageEntry })
      }
    })

    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors])
    }

    if (validQueue.length > 0) {
      const newItems = validQueue.map(v => v.imageEntry)
      const currentList = [...imagesRef.current, ...newItems]
      imagesRef.current = currentList
      onImagesChange(currentList)

      // Start processing each valid file
      validQueue.forEach(({ file, imageEntry }) => {
        uploadSingleFile(file, imageEntry.id)
      })
    }
  }

  const uploadSingleFile = (file: File, id: string) => {
    processFileWithProgress(
      file,
      (progress) => {
        const updated = imagesRef.current.map((img) =>
          img.id === id ? { ...img, progress } : img
        )
        imagesRef.current = updated
        onImagesChange(updated)
      },
      (dataUrl) => {
        const updated = imagesRef.current.map((img) =>
          img.id === id
            ? { ...img, dataUrl, status: 'ready' as const, progress: 100 }
            : img
        )
        imagesRef.current = updated
        onImagesChange(updated)
        // Clean up from pending files once successfully processed
        pendingFilesRef.current.delete(id)
      },
      (error) => {
        const updated = imagesRef.current.map((img) =>
          img.id === id
            ? { ...img, status: 'error' as const, error }
            : img
        )
        imagesRef.current = updated
        onImagesChange(updated)
      }
    )
  }

  const handleRetry = (id: string) => {
    const file = pendingFilesRef.current.get(id)
    if (!file) {
      setValidationErrors(prev => [...prev, 'Cannot retry: original file buffer is no longer available. Please re-upload.'])
      return
    }

    const updated = imagesRef.current.map((img) =>
      img.id === id
        ? { ...img, status: 'uploading' as const, progress: 10, error: undefined }
        : img
    )
    imagesRef.current = updated
    onImagesChange(updated)

    uploadSingleFile(file, id)
  }

  const handleRemove = (id: string) => {
    pendingFilesRef.current.delete(id)
    const updated = imagesRef.current.filter((img) => img.id !== id)
    imagesRef.current = updated
    onImagesChange(updated)
  }

  const clearErrors = () => {
    setValidationErrors([])
  }

  return (
    <div className="space-y-6">
      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-rose-400">
            <div className="flex items-center space-x-2 font-semibold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Upload Validation Issues ({validationErrors.length})</span>
            </div>
            <button
              onClick={clearErrors}
              className="text-xs text-rose-400/80 hover:text-rose-200 underline"
            >
              Dismiss All
            </button>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-300 space-y-1 pl-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.005]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_MIME_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-emerald-400'
          }`}>
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {isDragging ? 'Drop photographs here' : 'Upload room photographs'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Drag & drop photos here, or <span className="text-emerald-400 font-semibold underline underline-offset-2">browse files</span> from your computer
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono">
              Supported: JPEG, PNG, WEBP
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono">
              Max: 20 MB / file
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Multi-Angle Supported
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Angle Photography Guidance Card */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-white">
          <Camera className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
            Multi-Angle Photo Capture Guide for 3D Reconstruction
          </h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          For the most accurate 3D room reconstruction, capture <strong className="text-slate-200">2 to 6 photographs</strong> from distinct viewpoints around the room. Avoid extreme close-ups, moving objects, or heavy blur.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 mb-1">
              Angle 1: Corner Wide
            </span>
            <p className="text-[11px] text-slate-300">
              Stand in the primary corner showing wall-to-floor junctions and major furniture.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 mb-1">
              Angle 2: Opposite Corner
            </span>
            <p className="text-[11px] text-slate-300">
              Move to the opposite diagonal corner to capture depth and reverse perspectives.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 mb-1">
              Angle 3: Windows & Doors
            </span>
            <p className="text-[11px] text-slate-300">
              Frame doorway ingress openings and exterior windows for daylight & aperture mapping.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 mb-1">
              Angle 4: Central Panorama
            </span>
            <p className="text-[11px] text-slate-300">
              Step into the room center at chest level for a level architectural overview.
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Gallery Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Uploaded Photographs ({images.length})
              </h4>
              <span className="text-xs text-slate-400">
                &bull; {images.filter(i => i.status === 'ready').length} ready for 3D reconstruction
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Photos</span>
              </button>

              {onStartReconstruction && images.some(i => i.status === 'ready') && (
                <button
                  onClick={onStartReconstruction}
                  disabled={reconstructionStatus === 'generating' || reconstructionStatus === 'preparing'}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {reconstructionStatus === 'generating'
                      ? 'Reconstructing 3D Room...'
                      : reconstructionStatus === 'ready'
                      ? 'View Reconstructed 3D Room'
                      : 'Reconstruct 3D Room from Photos'}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
              >
                {/* Image Preview / Placeholder */}
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {img.dataUrl ? (
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 p-4">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-xs font-mono">Reading file...</span>
                    </div>
                  )}

                  {/* Status Indicator Overlay */}
                  <div className="absolute top-2 left-2">
                    {img.status === 'ready' && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/90 text-slate-950 shadow">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                    {img.status === 'uploading' && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/90 text-slate-950 shadow">
                        <span>{img.progress}%</span>
                      </span>
                    )}
                    {img.status === 'error' && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/90 text-white shadow">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {img.status === 'error' && (
                      <button
                        onClick={() => handleRetry(img.id)}
                        className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-500 text-white hover:text-slate-950 transition-colors shadow"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(img.id)}
                      className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-500 text-slate-300 hover:text-white transition-colors shadow"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar (when uploading) */}
                {img.status === 'uploading' && (
                  <div className="w-full bg-slate-800 h-1">
                    <div
                      className="bg-emerald-400 h-1 transition-all duration-200"
                      style={{ width: `${img.progress}%` }}
                    />
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="p-3 bg-slate-900">
                  <p className="text-xs font-medium text-white truncate" title={img.name}>
                    {img.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{formatFileSize(img.size)}</span>
                    <span className="uppercase">{img.type.replace('image/', '')}</span>
                  </div>
                  {img.error && (
                    <p className="text-[11px] text-rose-400 mt-1 line-clamp-1">
                      {img.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
