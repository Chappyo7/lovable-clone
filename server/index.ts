import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import path from 'path'
import { ProjectManager } from './project-manager.js'
import { ViteManager } from './vite-manager.js'
import { ClaudeManager } from './claude-manager.js'
import { handleMessage, type WsContext } from './ws-handler.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const PROJECT_ROOT = process.env.PROJECT_ROOT ?? path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? '.',
  'lovable-projects',
)
const TEMPLATE_DIR = path.resolve(process.cwd(), 'templates', 'vite-react')

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

// Services
const projectManager = new ProjectManager(PROJECT_ROOT, TEMPLATE_DIR)
const viteManager = new ViteManager()
const claudeManager = new ClaudeManager()

// JSON body parsing
app.use(express.json())

// REST API
app.get('/api/projects', async (_req, res) => {
  const projects = await projectManager.listProjects()
  res.json(projects)
})

app.post('/api/projects', async (req, res) => {
  const { name } = req.body
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const project = await projectManager.createProject(name)
  await projectManager.installDependencies(project.path)
  res.status(201).json(project)
})

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id)
    res.json(project)
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    viteManager.stop() // Stop vite if running this project
    await projectManager.deleteProject(req.params.id)
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

// Serve built client (production mode)
const clientDist = path.resolve(process.cwd(), 'dist', 'client')
app.use(express.static(clientDist))

// SPA fallback — serve index.html for client routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// WebSocket
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected')

  const ctx: WsContext = {
    projectManager,
    claudeManager,
    viteManager,
    send: (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    },
  }

  ws.on('message', async (data) => {
    try {
      await handleMessage(data.toString(), ctx)
    } catch (err) {
      ctx.send(JSON.stringify({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

// Startup checks
async function checkClaude(): Promise<boolean> {
  const { execSync } = await import('child_process')
  try {
    execSync('claude --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function ensureProjectRoot(): Promise<void> {
  const fs = await import('fs/promises')
  await fs.mkdir(PROJECT_ROOT, { recursive: true })
}

async function start(): Promise<void> {
  await ensureProjectRoot()

  const claudeOk = await checkClaude()
  if (!claudeOk) {
    console.warn('⚠️  Claude CLI not found. Install it or ensure it is in PATH.')
  }

  server.listen(PORT, () => {
    console.log(`⚡ Lovable Clone running at http://localhost:${PORT}`)
    console.log(`📁 Projects stored in ${PROJECT_ROOT}`)
    console.log(`🤖 Claude CLI: ${claudeOk ? '✓ found' : '✗ not found'}`)
  })
}

start()
