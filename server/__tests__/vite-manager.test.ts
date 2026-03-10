import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ViteManager } from '../vite-manager.js'

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const proc = {
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
    }
    return proc
  }),
}))

describe('ViteManager', () => {
  let vm: ViteManager

  beforeEach(() => {
    vm = new ViteManager()
  })

  it('starts with no active server', () => {
    expect(vm.getStatus()).toEqual({ running: false, port: null, projectId: null })
  })

  it('starts a vite server for a project', async () => {
    await vm.start('/path/to/project', 'my-app')
    const status = vm.getStatus()
    expect(status.running).toBe(true)
    expect(status.projectId).toBe('my-app')
    expect(status.port).toBeGreaterThanOrEqual(5174)
  })

  it('stops the current server', async () => {
    await vm.start('/path/to/project', 'my-app')
    vm.stop()
    expect(vm.getStatus().running).toBe(false)
  })

  it('restarts when switching projects', async () => {
    await vm.start('/path/to/project-a', 'app-a')
    await vm.start('/path/to/project-b', 'app-b')
    expect(vm.getStatus().projectId).toBe('app-b')
  })
})
