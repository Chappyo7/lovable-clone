import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

interface ViteStatus {
  running: boolean
  port: number | null
  projectId: string | null
}

export class ViteManager extends EventEmitter {
  private process: ChildProcess | null = null
  private port: number | null = null
  private projectId: string | null = null
  private static BASE_PORT = 5174
  private static MAX_PORT = 5184

  getStatus(): ViteStatus {
    return {
      running: this.process !== null,
      port: this.port,
      projectId: this.projectId,
    }
  }

  async start(projectPath: string, projectId: string): Promise<number> {
    // Stop existing server if running
    if (this.process) {
      this.stop()
    }

    this.port = await this.findAvailablePort()
    this.projectId = projectId

    this.process = spawn('npx', ['vite', '--port', String(this.port), '--host'], {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      if (output.includes('Local:') || output.includes('ready in')) {
        this.emit('ready', { port: this.port, projectId })
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('error', { message: data.toString(), projectId })
    })

    this.process.on('exit', (code) => {
      const crashedProjectPath = projectPath
      const crashedProjectId = projectId
      this.process = null

      if (code !== null && code !== 0) {
        this.emit('crash', { code, projectId: crashedProjectId })
        // Auto-restart after 2 seconds on crash
        setTimeout(async () => {
          try {
            console.log(`🔄 Auto-restarting Vite for ${crashedProjectId}...`)
            await this.start(crashedProjectPath, crashedProjectId)
          } catch (err) {
            console.error('Failed to auto-restart Vite:', err)
          }
        }, 2000)
      }
    })

    return this.port
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.port = null
      this.projectId = null
    }
  }

  private async findAvailablePort(): Promise<number> {
    const net = await import('net')
    for (let port = ViteManager.BASE_PORT; port <= ViteManager.MAX_PORT; port++) {
      const available = await new Promise<boolean>((resolve) => {
        const server = net.createServer()
        server.once('error', () => resolve(false))
        server.once('listening', () => {
          server.close(() => resolve(true))
        })
        server.listen(port, '127.0.0.1')
      })
      if (available) return port
    }
    throw new Error('No available ports in range 5174-5184')
  }
}
