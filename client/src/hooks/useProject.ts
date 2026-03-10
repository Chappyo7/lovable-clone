import { useState, useEffect, useCallback } from 'react'

export interface Project {
  id: string
  name: string
  path: string
  lastModified: string
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const project = await res.json()
    await fetchProjects()
    return project
  }, [fetchProjects])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await fetchProjects()
  }, [fetchProjects])

  return { projects, loading, createProject, deleteProject, refetch: fetchProjects }
}
