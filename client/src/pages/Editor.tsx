import { useState, useCallback, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import ChatPanel, { type Message, type ModelChoice } from '../components/ChatPanel'
import PreviewFrame from '../components/PreviewFrame'
import Toolbar from '../components/Toolbar'
import { useWebSocket, type ServerEvent } from '../hooks/useWebSocket'

export default function Editor() {
  const { id: projectId } = useParams<{ id: string }>()
  const location = useLocation()
  const initialPrompt = (location.state as { initialPrompt?: string })?.initialPrompt

  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewPort, setPreviewPort] = useState<number | null>(null)
  const [model, setModel] = useState<ModelChoice>('sonnet')
  const currentAssistantId = useRef<string | null>(null)
  const sentInitialPrompt = useRef(false)

  const handleEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case 'assistant_text':
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.id === currentAssistantId.current) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + event.content },
            ]
          }
          const newId = `assistant-${Date.now()}`
          currentAssistantId.current = newId
          return [...prev, { id: newId, role: 'assistant', content: event.content }]
        })
        break

      case 'tool_use':
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.id === currentAssistantId.current) {
            const activities = [...(last.activities ?? []), {
              tool: event.tool,
              path: event.path,
              status: event.status,
            }]
            return [...prev.slice(0, -1), { ...last, activities }]
          }
          return prev
        })
        break

      case 'tool_result':
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.id === currentAssistantId.current && last.activities) {
            let matched = false
            const activities = last.activities.map((a) => {
              if (!matched && a.tool === event.tool && a.status === 'running' && a.path === event.path) {
                matched = true
                return { ...a, status: event.status }
              }
              return a
            })
            return [...prev.slice(0, -1), { ...last, activities }]
          }
          return prev
        })
        break

      case 'stream_complete':
        setIsStreaming(false)
        currentAssistantId.current = null
        break

      case 'vite_status':
        if (event.status === 'ready') {
          setPreviewPort(event.port)
        }
        break

      case 'error':
        setMessages((prev) => [
          ...prev,
          { id: `error-${Date.now()}`, role: 'assistant', content: `❌ Error: ${event.message}` },
        ])
        setIsStreaming(false)
        break
    }
  }, [])

  const { send, connected } = useWebSocket(handleEvent)

  // Send initial prompt if navigated from dashboard
  if (initialPrompt && !sentInitialPrompt.current && connected && projectId) {
    sentInitialPrompt.current = true
    setTimeout(() => {
      setMessages([{ id: `user-${Date.now()}`, role: 'user', content: initialPrompt }])
      setIsStreaming(true)
      send({ type: 'send_prompt', projectId, content: initialPrompt, model })
    }, 500)
  }

  const handleSendPrompt = (content: string) => {
    if (!projectId) return
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content }])
    setIsStreaming(true)
    send({ type: 'send_prompt', projectId, content, model })
  }

  const handleCancel = () => {
    if (!projectId) return
    send({ type: 'cancel', projectId })
    setIsStreaming(false)
  }

  const handleRefresh = () => {
    // Force iframe refresh by toggling port
    const p = previewPort
    setPreviewPort(null)
    setTimeout(() => setPreviewPort(p), 100)
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Toolbar
        projectName={projectId ?? 'Unknown'}
        previewPort={previewPort}
        onRefresh={handleRefresh}
      />
      <div className="flex flex-1 overflow-hidden">
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          model={model}
          onModelChange={setModel}
          onSendPrompt={handleSendPrompt}
          onCancel={handleCancel}
        />
        <PreviewFrame port={previewPort} />
      </div>
    </div>
  )
}
