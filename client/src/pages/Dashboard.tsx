import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ProjectCard, { NewProjectCard } from '../components/ProjectCard'
import { useProjects } from '../hooks/useProject'

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, createProject } = useProjects()
  const [prompt, setPrompt] = useState('')

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    const name = prompt.trim().slice(0, 40)
    const project = await createProject(name)
    navigate(`/project/${project.id}`, { state: { initialPrompt: prompt } })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-base flex">
      <Sidebar projects={projects} onProjectClick={(id) => navigate(`/project/${id}`)} />

      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#0b1628] via-[#111d33] to-[#0f1a2e]">
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-white">What do you want to build?</h1>
          <p className="text-text-secondary text-sm mt-1">Powered by Claude Code · Your local AI app builder</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 w-[500px] max-w-[80%] shadow-[0_0_30px_rgba(91,156,245,0.05)]">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your app idea..."
            className="w-full bg-transparent text-text-primary placeholder-text-secondary resize-none outline-none text-sm min-h-[40px]"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-base font-bold hover:brightness-110 transition"
            >
              ↑
            </button>
          </div>
        </div>

        {projects.length > 0 && (
          <div className="mt-8 w-[500px] max-w-[80%]">
            <div className="text-text-secondary text-[11px] uppercase tracking-wider mb-2">Recent Projects</div>
            <div className="flex gap-3">
              {projects.slice(0, 2).map((p) => (
                <ProjectCard
                  key={p.id}
                  name={p.name}
                  lastModified={p.lastModified}
                  onClick={() => navigate(`/project/${p.id}`)}
                />
              ))}
              <NewProjectCard onClick={() => document.querySelector('textarea')?.focus()} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
