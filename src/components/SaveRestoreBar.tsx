import React, { useRef, useState } from 'react'
import { Project } from '../types/project'
import { 
  exportProjectToJSON, 
  triggerDownloadJSON, 
  validateAndParseProjectBundle, 
  cloneProjectForImport 
} from '../services/designSerializationService'
import { 
  Download, 
  Upload, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  FileJson
} from 'lucide-react'

interface SaveRestoreBarProps {
  project: Project
  onSaveManual?: () => void
  onImportProject: (imported: Project) => void
  lastSavedTime?: string
}

export function SaveRestoreBar({
  project,
  onSaveManual,
  onImportProject,
  lastSavedTime
}: SaveRestoreBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  const handleExport = () => {
    const jsonStr = exportProjectToJSON(project)
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'design_project'
    triggerDownloadJSON(`${safeName}_bundle.json`, jsonStr)
    setSaveToast(`Exported "${project.name}" as JSON bundle`)
    setTimeout(() => setSaveToast(null), 3500)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const parseResult = validateAndParseProjectBundle(content)

      if (!parseResult.valid || !parseResult.project) {
        setImportError(parseResult.error || 'Failed to import project bundle.')
        return
      }

      // Clone with safe ID so existing projects are not overwritten
      const importedClone = cloneProjectForImport(parseResult.project)
      onImportProject(importedClone)
      setSaveToast(`Successfully imported "${importedClone.name}"!`)
      setTimeout(() => setSaveToast(null), 3500)

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    reader.onerror = () => {
      setImportError('Failed to read the selected file.')
    }

    reader.readAsText(file)
  }

  const handleManualSave = () => {
    if (onSaveManual) {
      onSaveManual()
      setSaveToast('Saved project to local storage.')
      setTimeout(() => setSaveToast(null), 3000)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 sm:px-4 rounded-xl text-xs">
        {/* Save Status */}
        <div className="flex items-center space-x-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            State Persisted &bull; <span className="text-slate-400 font-mono text-[11px]">{lastSavedTime ? `Auto-saved at ${lastSavedTime}` : 'All changes saved to storage'}</span>
          </span>
        </div>

        {/* Action Buttons: Save, Export, Import */}
        <div className="flex items-center space-x-2">
          {onSaveManual && (
            <button
              onClick={handleManualSave}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700/80"
              title="Force save snapshot to browser storage"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium transition-colors border border-emerald-500/30"
            title="Download full project JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (.json)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-colors border border-blue-500/30"
            title="Load design from an exported JSON file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import (.json)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Notifications / Toast / Error */}
      {saveToast && (
        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-in fade-in">
          <FileJson className="w-3.5 h-3.5" />
          <span>{saveToast}</span>
        </div>
      )}

      {importError && (
        <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{importError}</span>
        </div>
      )}
    </div>
  )
}
