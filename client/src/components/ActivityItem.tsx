interface ActivityItemProps {
  tool: string
  path?: string
  status: 'running' | 'complete' | 'error'
}

export default function ActivityItem({ tool, path, status }: ActivityItemProps) {
  const borderColor = status === 'complete' ? 'border-l-success'
    : status === 'error' ? 'border-l-red-400'
    : 'border-l-accent'
  const icon = status === 'complete' ? '✓' : status === 'error' ? '✗' : '⟳'
  const textColor = status === 'complete' ? 'text-success'
    : status === 'error' ? 'text-red-400'
    : 'text-accent'

  const label = path
    ? `${icon} ${status === 'complete' ? 'Completed' : status === 'error' ? 'Failed' : 'Running'} ${tool}: ${path}`
    : `${icon} ${tool}`

  return (
    <div className={`bg-surface border border-border ${borderColor} border-l-2 rounded-md p-2 mb-1`}>
      <div className={`${textColor} text-[10px] font-mono`}>{label}</div>
    </div>
  )
}
