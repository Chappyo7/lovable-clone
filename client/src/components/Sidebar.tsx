import type { Project } from '../hooks/useProject'

interface SidebarProps {
  projects: Project[]
  onProjectClick: (id: string) => void
}

export default function Sidebar({ projects, onProjectClick }: SidebarProps) {
  return (
    <div className="w-[200px] bg-surface border-r border-border p-4 flex-shrink-0 flex flex-col">
      <div className="font-bold text-white mb-4 text-sm flex items-center gap-1.5">
        <span className="text-accent">⚡</span> Lovable Clone
      </div>

      <div className="text-text-secondary text-[11px] uppercase tracking-wider mb-2">Navigation</div>
      <div className="px-2 py-1.5 bg-card rounded-md text-primary border-l-2 border-accent mb-1 text-sm">
        ⌂ Home
      </div>

      <div className="text-text-secondary text-[11px] uppercase tracking-wider mt-4 mb-2">Recent Projects</div>
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onProjectClick(project.id)}
          className="w-full text-left px-2 py-1.5 text-text-primary hover:bg-card rounded-md mb-0.5 text-sm flex items-center gap-1.5 transition-colors"
        >
          <div className="w-1.5 h-1.5 bg-accent rounded-full" />
          {project.name}
        </button>
      ))}
    </div>
  )
}
