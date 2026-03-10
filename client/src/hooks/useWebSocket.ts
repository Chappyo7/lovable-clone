import { useEffect, useRef, useState, useCallback } from 'react'

export type ServerEvent =
  | { type: 'assistant_text'; content: string }
  | { type: 'tool_use'; tool: string; path?: string; status: 'running' }
  | { type: 'tool_result'; tool: string; path?: string; status: 'complete' | 'error'; output?: string }
  | { type: 'stream_complete' }
  | { type: 'error'; message: string }
  | { type: 'vite_status'; status: string; port: number }

export function useWebSocket(onEvent: (event: ServerEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onEventRef.current = onEvent

  useEffect(() => {
    let unmounted = false

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        // Auto-reconnect after 2 seconds unless unmounted
        if (!unmounted) {
          reconnectTimerRef.current = setTimeout(connect, 2000)
        }
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerEvent
          onEventRef.current(data)
        } catch {
          // Ignore unparseable messages
        }
      }
    }

    connect()

    return () => {
      unmounted = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      wsRef.current?.close()
    }
  }, [])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { connected, send }
}
