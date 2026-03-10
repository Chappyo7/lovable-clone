import fs from 'fs/promises'
import path from 'path'

export interface Project {
  id: string
  name: string
  path: string
  lastModified: string
}

export class ProjectManager {
  constructor(
    private projectRoot: string,
    private templateDir: string,
  ) {}

  async listProjects(): Promise<Project[]> {
    try {
      const entries = await fs.readdir(this.projectRoot, { withFileTypes: true })
      const projects: Project[] = []

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const metaPath = path.join(this.projectRoot, entry.name, '.lovable-clone', 'meta.json')
        try {
          const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
          const stat = await fs.stat(path.join(this.projectRoot, entry.name))
          projects.push({
            id: entry.name,
            name: meta.name,
            path: path.join(this.projectRoot, entry.name),
            lastModified: stat.mtime.toISOString(),
          })
        } catch {
          // Skip directories without meta — not a lovable project
        }
      }

      return projects.sort(
        (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )
    } catch {
      return []
    }
  }

  async createProject(name: string): Promise<Project> {
    const baseId = this.toKebabCase(name)
    let id = baseId
    let attempt = 0

    while (true) {
      const projectPath = path.join(this.projectRoot, id)
      try {
        await fs.access(projectPath)
        // Directory exists, try next
        attempt++
        id = `${baseId}-${attempt}`
      } catch {
        // Directory does not exist — use this id
        break
      }
    }

    const projectPath = path.join(this.projectRoot, id)
    await this.copyTemplate(projectPath, id)

    // Write meta file
    const metaDir = path.join(projectPath, '.lovable-clone')
    await fs.mkdir(metaDir, { recursive: true })
    await fs.writeFile(
      path.join(metaDir, 'meta.json'),
      JSON.stringify({ name, createdAt: new Date().toISOString() }),
    )

    const stat = await fs.stat(projectPath)
    return { id, name, path: projectPath, lastModified: stat.mtime.toISOString() }
  }

  async getProject(id: string): Promise<Project> {
    const projectPath = path.join(this.projectRoot, id)
    const metaPath = path.join(projectPath, '.lovable-clone', 'meta.json')

    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    const stat = await fs.stat(projectPath)
    return { id, name: meta.name, path: projectPath, lastModified: stat.mtime.toISOString() }
  }

  async installDependencies(projectPath: string): Promise<void> {
    const { execSync } = await import('child_process')
    execSync('npm install', { cwd: projectPath, stdio: 'pipe' })
  }

  async deleteProject(id: string): Promise<void> {
    const projectPath = path.join(this.projectRoot, id)
    await fs.rm(projectPath, { recursive: true, force: true })
  }

  private async copyTemplate(dest: string, projectName: string): Promise<void> {
    await this.copyDir(this.templateDir, dest, projectName)
  }

  private async copyDir(src: string, dest: string, projectName: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath, projectName)
      } else {
        let content = await fs.readFile(srcPath, 'utf-8')
        content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName)
        await fs.writeFile(destPath, content)
      }
    }
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
