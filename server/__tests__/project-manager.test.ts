import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ProjectManager } from '../project-manager.js'

describe('ProjectManager', () => {
  let tmpDir: string
  let pm: ProjectManager

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lovable-test-'))
    pm = new ProjectManager(tmpDir, path.resolve('templates/vite-react'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('lists projects (empty initially)', async () => {
    const projects = await pm.listProjects()
    expect(projects).toEqual([])
  })

  it('creates a project from a name', async () => {
    const project = await pm.createProject('My App')
    expect(project.id).toBe('my-app')
    expect(project.name).toBe('My App')

    const packageJson = await fs.readFile(
      path.join(tmpDir, 'my-app', 'package.json'), 'utf-8'
    )
    expect(JSON.parse(packageJson).name).toBe('my-app')
  })

  it('creates unique IDs for duplicate names', async () => {
    await pm.createProject('My App')
    const second = await pm.createProject('My App')
    expect(second.id).toMatch(/^my-app-\d+$/)
  })

  it('lists created projects sorted by lastModified desc', async () => {
    await pm.createProject('Alpha')
    await pm.createProject('Beta')
    const projects = await pm.listProjects()
    expect(projects).toHaveLength(2)
    expect(projects[0].id).toBe('beta')
    expect(projects[1].id).toBe('alpha')
  })

  it('gets a project by ID', async () => {
    await pm.createProject('My App')
    const project = await pm.getProject('my-app')
    expect(project.name).toBe('My App')
    expect(project.id).toBe('my-app')
  })

  it('throws when getting a nonexistent project', async () => {
    await expect(pm.getProject('nope')).rejects.toThrow()
  })

  it('deletes a project', async () => {
    await pm.createProject('My App')
    await pm.deleteProject('my-app')
    const projects = await pm.listProjects()
    expect(projects).toEqual([])
  })

  it('replaces {{PROJECT_NAME}} in template files', async () => {
    await pm.createProject('Cool App')
    const html = await fs.readFile(
      path.join(tmpDir, 'cool-app', 'index.html'), 'utf-8'
    )
    expect(html).toContain('cool-app')
    expect(html).not.toContain('{{PROJECT_NAME}}')
  })
})
