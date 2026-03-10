interface ProjectCardProps {
  name: string
  lastModified: string
  onClick: () => void
}

export default function ProjectCard({ name, lastModified, onClick }: ProjectCardProps) {
  const timeAgo = getTimeAgo(lastModified)

  return (
    <button
      onClick={onClick}
      className="flex-1 bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors text-left"
    >
      <div className="h-[60px] bg-gradient-to-br from-[#1a2a40] to-[#1e3350]" />
      <div className="p-2">
        <div className="text-white text-[11px] font-bold">{name}</div>
        <div className="text-text-secondary text-[10px]">{timeAgo}</div>
      </div>
    </button>
  )
}

export function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 bg-card border border-border rounded-lg overflow-hidden hover:border-accent transition-colors flex items-center justify-center min-h-[92px]"
    >
      <span className="text-accent text-2xl">+</span>
    </button>
  )
}

function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
