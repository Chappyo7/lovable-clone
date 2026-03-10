import ActivityItem from './ActivityItem'

export interface ChatActivity {
  tool: string
  path?: string
  status: 'running' | 'complete' | 'error'
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  activities?: ChatActivity[]
}

export default function ChatMessage({ role, content, activities }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 mb-3">
        <div className="text-primary text-[10px] mb-1">You</div>
        <div className="text-white text-sm">{content}</div>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="text-accent text-[10px] mb-1">⚡ Claude</div>
      {content && <div className="text-text-primary text-sm mb-2 whitespace-pre-wrap">{content}</div>}
      {activities?.map((a, i) => (
        <ActivityItem key={i} tool={a.tool} path={a.path} status={a.status} />
      ))}
    </div>
  )
}
