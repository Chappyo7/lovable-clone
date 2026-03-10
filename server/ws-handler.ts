import type { ProjectManager } from './project-manager.js'
import type { ViteManager } from './vite-manager.js'
import type { ClaudeManager, ClaudeEvent } from './claude-manager.js'

export interface WsContext {
  projectManager: ProjectManager
  claudeManager: ClaudeManager
  viteManager: ViteManager
  send: (data: string) => void
}

interface ClientMessage {
  type: 'send_prompt' | 'cancel' | 'switch_project'
  projectId: string
  content?: string
}

export async function handleMessage(raw: string, ctx: WsContext): Promise<void> {
  let msg: ClientMessage
  try {
    msg = JSON.parse(raw)
  } catch {
    ctx.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
    return
  }

  switch (msg.type) {
    case 'send_prompt':
      await handleSendPrompt(msg, ctx)
      break
    case 'cancel':
      ctx.claudeManager.cancel()
      ctx.send(JSON.stringify({ type: 'stream_complete' }))
      break
    case 'switch_project':
      await handleSwitchProject(msg, ctx)
      break
    default:
      ctx.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${(msg as any).type}` }))
  }
}

async function handleSendPrompt(msg: ClientMessage, ctx: WsContext): Promise<void> {
  if (ctx.claudeManager.isBusy()) {
    ctx.send(JSON.stringify({ type: 'error', message: 'Claude is busy. Cancel or wait.' }))
    return
  }

  if (!msg.content?.trim()) {
    ctx.send(JSON.stringify({ type: 'error', message: 'Empty prompt' }))
    return
  }

  const project = await ctx.projectManager.getProject(msg.projectId)

  // Ensure Vite is running for this project
  const viteStatus = ctx.viteManager.getStatus()
  if (!viteStatus.running || viteStatus.projectId !== msg.projectId) {
    const port = await ctx.viteManager.start(project.path, msg.projectId)
    ctx.send(JSON.stringify({ type: 'vite_status', status: 'ready', port }))
  }

  // Read conversation ID if it exists
  const fs = await import('fs/promises')
  const path = await import('path')
  let conversationId: string | undefined
  try {
    const statePath = path.join(project.path, '.lovable-clone', 'state.json')
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'))
    conversationId = state.conversationId ?? undefined
  } catch {
    // No state yet
  }

  ctx.claudeManager.sendPrompt(
    project.path,
    msg.projectId,
    msg.content,
    conversationId,
    (event: ClaudeEvent) => {
      ctx.send(JSON.stringify(event))
    },
  )
}

async function handleSwitchProject(msg: ClientMessage, ctx: WsContext): Promise<void> {
  // Cancel any running Claude process
  if (ctx.claudeManager.isBusy()) {
    ctx.claudeManager.cancel()
  }

  const project = await ctx.projectManager.getProject(msg.projectId)
  const port = await ctx.viteManager.start(project.path, msg.projectId)
  ctx.send(JSON.stringify({ type: 'vite_status', status: 'ready', port }))
}
