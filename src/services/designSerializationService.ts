import { Project } from '../types/project'
import { projectStorage } from './projectStorage'

export const CURRENT_SCHEMA_VERSION = 2

export interface ProjectExportBundle {
  bundleType: 'DECOHOME_DESIGN_PROJECT'
  schemaVersion: number
  exportedAt: string
  project: Project
}

/**
 * Serializes a project into a standardized, versioned JSON export bundle.
 */
export function exportProjectToJSON(project: Project): string {
  const bundle: ProjectExportBundle = {
    bundleType: 'DECOHOME_DESIGN_PROJECT',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      ...project,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    }
  }

  return JSON.stringify(bundle, null, 2)
}

/**
 * Triggers a client-side download of the JSON design file.
 */
export function triggerDownloadJSON(filename: string, jsonString: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Validates and safely parses an imported JSON string into a valid Project object.
 */
export function validateAndParseProjectBundle(
  jsonString: string
): { valid: boolean; project?: Project; error?: string } {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { valid: false, error: 'Empty or invalid JSON content.' }
    }

    const parsed = JSON.parse(jsonString)

    // Check if wrapped in a ProjectExportBundle or is a raw Project object
    let rawProject: any = parsed
    if (parsed && parsed.bundleType === 'DECOHOME_DESIGN_PROJECT' && parsed.project) {
      rawProject = parsed.project
    }

    // Required field validation
    if (!rawProject || typeof rawProject !== 'object') {
      return { valid: false, error: 'Malformed JSON: project root is not an object.' }
    }

    if (!rawProject.name || typeof rawProject.name !== 'string') {
      return { valid: false, error: 'Validation failed: Project "name" is missing or invalid.' }
    }

    if (!rawProject.scope || (rawProject.scope !== 'complete_house' && rawProject.scope !== 'individual_room')) {
      return { valid: false, error: 'Validation failed: Project "scope" must be complete_house or individual_room.' }
    }

    // Schema normalization & backwards compatibility migration
    const validatedProject: Project = {
      id: rawProject.id || `proj_${Date.now()}`,
      name: rawProject.name.trim(),
      scope: rawProject.scope,
      roomType: rawProject.roomType || 'Living Room',
      images: Array.isArray(rawProject.images) ? rawProject.images : [],
      analysisResult: rawProject.analysisResult || undefined,
      furniture: Array.isArray(rawProject.furniture) ? rawProject.furniture : [],
      revisionHistory: Array.isArray(rawProject.revisionHistory) ? rawProject.revisionHistory : [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: rawProject.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return { valid: true, project: validatedProject }
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message || 'Unable to parse file'}` }
  }
}

/**
 * Clones an imported project with a fresh ID so it safely coexists alongside existing projects.
 */
export function cloneProjectForImport(project: Project, renamePrefix: string = 'Imported'): Project {
  return {
    ...project,
    id: `proj_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${project.name} (${renamePrefix})`,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Persists an imported or restored project into local storage.
 */
export function persistRestoredProject(project: Project): boolean {
  return projectStorage.addProject(project)
}
