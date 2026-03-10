import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeManager, type ClaudeEvent } from '../claude-manager.js'

// Mock child_process.spawn
const mockStdout = { on: vi.fn() }
const mockStderr = { on: vi.fn() }
const mockProcess = {
  pid: 99999,
  stdout: mockStdout,
  stderr: mockStderr,
  on: vi.fn(),
  kill: vi.fn(),
}

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProcess),
}))

describe('ClaudeManager', () => {
  let cm: ClaudeManager

  beforeEach(() => {
    vi.clearAllMocks()
    cm = new ClaudeManager()
  })

  it('starts not busy', () => {
    expect(cm.isBusy()).toBe(false)
  })

  it('becomes busy when sending a prompt', () => {
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined)
    expect(cm.isBusy()).toBe(true)
  })

  it('can cancel a running process', () => {
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined)
    cm.cancel()
    expect(mockProcess.kill).toHaveBeenCalled()
    expect(cm.isBusy()).toBe(false)
  })

  it('emits events callback for each parsed line', () => {
    const events: ClaudeEvent[] = []
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined, (event) => {
      events.push(event)
    })

    // Simulate stdout data from the mock
    const stdoutHandler = mockStdout.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'data'
    )?.[1]
    expect(stdoutHandler).toBeDefined()

    // Simulate a stream-json line
    stdoutHandler(Buffer.from('{"type":"assistant","message":{"content":[{"type":"text","text":"Hello!"}]}}\n'))

    expect(events.length).toBeGreaterThan(0)
  })
})
