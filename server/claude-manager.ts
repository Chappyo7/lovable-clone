import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export type ClaudeEvent =
  | { type: 'assistant_text'; content: string }
  | { type: 'tool_use'; tool: string; path?: string; status: 'running' }
  | { type: 'tool_result'; tool: string; path?: string; status: 'complete' | 'error'; output?: string }
  | { type: 'stream_complete' }
  | { type: 'error'; message: string }

export class ClaudeManager {
  private process: ChildProcess | null = null
  private buffer = ''
  private timeout: ReturnType<typeof setTimeout> | null = null
  private static TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

  isBusy(): boolean {
    return this.process !== null
  }

  sendPrompt(
    projectPath: string,
    projectId: string,
    prompt: string,
    conversationId: string | undefined,
    onEvent?: (event: ClaudeEvent) => void,
    model?: string,
  ): void {
    if (this.process) {
      throw new Error('Claude is busy — cancel or wait for completion')
    }

    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
    ]

    if (model) {
      args.push('--model', model)
    }

    if (conversationId) {
      args.push('--resume', conversationId)
    }

    this.process = spawn('claude', args, {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this.buffer = ''
    let capturedConversationId: string | undefined

    // 5-minute timeout — kill the process if it hangs
    this.timeout = setTimeout(() => {
      if (this.process) {
        onEvent?.({ type: 'error', message: 'Claude CLI timed out after 15 minutes' })
        this.cancel()
      }
    }, ClaudeManager.TIMEOUT_MS)

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString()
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? '' // Keep incomplete last line in buffer

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const raw = JSON.parse(line)

          // Capture conversation ID from result event
          if (raw.type === 'result' && raw.session_id) {
            capturedConversationId = raw.session_id
          }

          const events = this.parseRawEvent(raw)
          for (const event of events) {
            onEvent?.(event)
          }
        } catch {
          // Skip unparseable lines
        }
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim()
      if (message) {
        // Detect authentication errors
        if (message.includes('not authenticated') || message.includes('login') || message.includes('auth')) {
          onEvent?.({ type: 'error', message: `Authentication error: ${message}. Run \`claude login\` in your terminal.` })
        } else {
          onEvent?.({ type: 'error', message })
        }
      }
    })

    this.process.on('exit', async (code) => {
      if (this.timeout) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this.process = null
      this.buffer = ''

      if (code !== 0 && code !== null) {
        onEvent?.({ type: 'error', message: `Claude CLI exited with code ${code}` })
      }

      onEvent?.({ type: 'stream_complete' })

      // Save conversation ID if captured
      if (capturedConversationId) {
        await this.saveConversationId(projectPath, capturedConversationId)
      }
    })
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    if (this.process) {
      this.process.kill()
      this.process = null
      this.buffer = ''
    }
  }

  private parseRawEvent(raw: Record<string, unknown>): ClaudeEvent[] {
    const events: ClaudeEvent[] = []
    const type = raw.type as string

    // Handle top-level message types from CLI stream-json
    if (type === 'assistant') {
      const message = raw.message as Record<string, unknown> | undefined
      if (message?.content && Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text' && block.text) {
            events.push({ type: 'assistant_text', content: block.text })
          }
          if (block.type === 'tool_use') {
            events.push({
              type: 'tool_use',
              tool: block.name ?? 'unknown',
              path: this.extractPath(block.input),
              status: 'running',
            })
          }
        }
      }
    }

    if (type === 'result') {
      const message = raw.result as Record<string, unknown> | undefined
      if (message) {
        // result events often contain tool outputs
        events.push({
          type: 'tool_result',
          tool: (message.tool_name as string) ?? 'unknown',
          status: 'complete',
          output: message.output as string | undefined,
        })
      }
    }

    return events
  }

  private extractPath(input: unknown): string | undefined {
    if (typeof input === 'object' && input !== null) {
      const obj = input as Record<string, unknown>
      return (obj.file_path ?? obj.path ?? obj.command) as string | undefined
    }
    return undefined
  }

  private async saveConversationId(projectPath: string, conversationId: string): Promise<void> {
    const stateDir = path.join(projectPath, '.lovable-clone')
    const statePath = path.join(stateDir, 'state.json')

    await fs.mkdir(stateDir, { recursive: true })
    await fs.writeFile(statePath, JSON.stringify({
      conversationId,
      createdAt: new Date().toISOString(),
    }))
  }
}
