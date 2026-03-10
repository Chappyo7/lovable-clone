import { useNavigate } from 'react-router-dom'

interface ToolbarProps {
  projectName: string
  previewPort: number | null
  onRefresh: () => void
}

export default function Toolbar({ projectName, previewPort, onRefresh }: ToolbarProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between bg-surface border-b border-border px-4 py-2">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-primary hover:text-white transition text-sm">
          ← Back
        </button>
        <span className="text-white font-bold text-sm">{projectName}</span>
        {previewPort && (
          <span className="text-accent text-[10px]">● Active</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="text-text-secondary hover:text-white transition text-sm px-1.5 py-0.5 border border-border rounded"
          title="Refresh preview"
        >
          🔄
        </button>
      </div>
    </div>
  )
}
