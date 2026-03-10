import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleMessage, type WsContext } from '../ws-handler.js'

describe('ws-handler', () => {
  let mockContext: WsContext

  beforeEach(() => {
    mockContext = {
      projectManager: {
        createProject: vi.fn().mockResolvedValue({ id: 'my-app', name: 'My App', path: '/tmp/my-app', lastModified: '' }),
        getProject: vi.fn().mockResolvedValue({ id: 'my-app', name: 'My App', path: '/tmp/my-app', lastModified: '' }),
      } as any,
      claudeManager: {
        isBusy: vi.fn().mockReturnValue(false),
        sendPrompt: vi.fn(),
        cancel: vi.fn(),
      } as any,
      viteManager: {
        start: vi.fn().mockResolvedValue(5174),
        stop: vi.fn(),
        getStatus: vi.fn().mockReturnValue({ running: false, port: null, projectId: null }),
      } as any,
      send: vi.fn(),
    }
  })

  it('handles send_prompt by starting Claude', async () => {
    await handleMessage(
      JSON.stringify({ type: 'send_prompt', projectId: 'my-app', content: 'Hello' }),
      mockContext,
    )
    expect(mockContext.claudeManager.sendPrompt).toHaveBeenCalled()
  })

  it('handles cancel by stopping Claude', async () => {
    await handleMessage(
      JSON.stringify({ type: 'cancel', projectId: 'my-app' }),
      mockContext,
    )
    expect(mockContext.claudeManager.cancel).toHaveBeenCalled()
  })

  it('rejects send_prompt when Claude is busy', async () => {
    (mockContext.claudeManager.isBusy as any).mockReturnValue(true)
    await handleMessage(
      JSON.stringify({ type: 'send_prompt', projectId: 'my-app', content: 'Hello' }),
      mockContext,
    )
    expect(mockContext.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"error"')
    )
  })
})
