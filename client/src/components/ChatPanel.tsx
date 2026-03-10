import { useState, useRef, useEffect } from 'react'
import ChatMessage, { type ChatActivity } from './ChatMessage'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  activities?: ChatActivity[]
}

interface ChatPanelProps {
  messages: Message[]
  isStreaming: boolean
  onSendPrompt: (content: string) => void
  onCancel: () => void
}

export default function ChatPanel({ messages, isStreaming, onSendPrompt, onCancel }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return
    onSendPrompt(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-[340px] bg-[#0a0e18] border-r border-border flex flex-col flex-shrink-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            activities={msg.activities}
          />
        ))}
        {isStreaming && (
          <div className="text-accent text-[10px] animate-pulse">Claude is thinking...</div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="bg-card border border-border rounded-lg p-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Claude what to do next..."
            className="w-full bg-transparent text-text-primary placeholder-text-secondary resize-none outline-none text-sm min-h-[32px]"
            rows={2}
            disabled={isStreaming}
          />
          <div className="flex justify-end mt-1.5 gap-2">
            {isStreaming && (
              <button
                onClick={onCancel}
                className="text-[10px] text-red-400 hover:text-red-300 transition"
              >
                Stop
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isStreaming || !input.trim()}
              className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-base font-bold hover:brightness-110 transition disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
