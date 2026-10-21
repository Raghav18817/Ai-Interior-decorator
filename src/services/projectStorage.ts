import { Project } from '../types/project'

const STORAGE_KEY = 'decohome_projects_v1'
const ACTIVE_PROJECT_KEY = 'decohome_active_project_id'

export const projectStorage = {
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.error('Failed to load projects from storage:', err)
      return []
    }
  },

  async fetchRemoteProjects(): Promise<Project[]> {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.projects)) {
          this.saveProjects(data.projects)
          return data.projects
        }
      }
    } catch {
      // Offline fallback
    }
    return this.getProjects()
  },

  saveProjects(projects: Project[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
      return true
    } catch (err) {
      console.error('Failed to save projects to storage:', err)
      return false
    }
  },

  addProject(project: Project): boolean {
    const existing = this.getProjects()
    const updated = [project, ...existing.filter(p => p.id !== project.id)]
    const success = this.saveProjects(updated)

    // Sync with persistent backend database
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    }).catch(() => {})

    return success
  },

  deleteProject(id: string): boolean {
    const existing = this.getProjects()
    const updated = existing.filter(p => p.id !== id)
    const success = this.saveProjects(updated)
    if (this.getActiveProjectId() === id) {
      this.setActiveProjectId(null)
    }

    // Sync deletion with backend database
    fetch(`/api/projects/${id}`, {
      method: 'DELETE'
    }).catch(() => {})

    return success
  },

  getActiveProjectId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_PROJECT_KEY)
    } catch {
      return null
    }
  },

  setActiveProjectId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, id)
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_KEY)
      }
    } catch (err) {
      console.error('Failed to set active project id:', err)
    }
  }
}
