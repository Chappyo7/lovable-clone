# Lovable Clone — Design Spec

A local, chat-driven web UI for building apps with Claude Code. Type a prompt, watch Claude generate code, see your app live in a preview panel — the Lovable experience, running entirely on your machine using your existing Claude subscription.

## Goals

- Replicate the core Lovable UX: chat → code generation → live preview
- Run locally, authenticated via existing Claude Code CLI login
- V1 covers the essentials; Supabase and deploy features come later

## Non-Goals (V1)

- Multi-user / auth
- Built-in code editor (use VS Code alongside)
- Deploy to Vercel/Netlify (future)
- Supabase integration (future)
- Version history UI (git handles this)
- Image upload in chat

## Architecture

Hybrid approach — a single Node.js backend serves the chat UI and manages both the Claude CLI subprocess and the Vite dev server. Two processes total.

```
Browser (localhost:3001)
├── Chat UI (served as static files by backend)
└── Preview iframe → localhost:5174 (direct Vite HMR)

Backend Server (Node.js + Express, :3001)
├── Static file server — serves built React chat UI
├── WebSocket handler — streams Claude output + activity events
├── Claude CLI manager — spawns/manages claude subprocess
├── Vite lifecycle manager — spawns/restarts Vite for preview
└── Project manager — CRUD projects on filesystem

Subprocesses
├── Claude CLI (claude --output-format stream-json)
│   Uses existing CLI auth (your paid subscription)
└── Vite Dev Server (:5174)
    Serves the generated app with HMR
```

### Data Flow

1. User types prompt in chat UI
2. Chat UI sends message via WebSocket to backend
3. Backend pipes prompt to Claude CLI subprocess stdin
4. Claude CLI streams JSON events back (text, tool_use, result, error)
5. Backend relays each event via WebSocket to chat UI
6. Chat UI renders streaming text + activity feed items
7. Vite detects file changes Claude made → HMR → preview auto-updates

### Why This Architecture

- **One URL** — user just opens localhost:3001
- **Native HMR** — preview iframe points directly at Vite, no proxy layer
- **Backend manages lifecycle** — spawns and restarts Vite automatically
- **Simple** — two processes, no CORS config, no service mesh

## Generated App Stack

Every new project Claude creates uses:

- React + TypeScript
- Vite (dev server + build)
- Tailwind CSS
- shadcn/ui components

This is locked for V1. Claude knows this stack extremely well, and Vite's HMR makes the preview seamless.

## UI Design

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Base | Deep navy | `#0b0f1a` |
| Surface | Dark blue-grey | `#0e1525` |
| Card | Blue-grey | `#111d33` |
| Border | Muted blue | `#1c2d47` |
| Primary | Blue | `#5b9cf5` |
| Accent | Yellow | `#f5c542` |
| Success | Green | `#4ade80` |
| Text | Light grey | `#c8cdd8` |

### Dashboard Screen (localhost:3001)

- Left sidebar: navigation (Home, Starred) + recent projects list
- Center: large prompt input ("What do you want to build?") with gradient background
- Below prompt: recent project cards with thumbnails and "+" new project card
- Yellow accent on send button and active indicators

### Editor Screen (localhost:3001/project/:id)

- **Top toolbar:** Back button, project name, Preview/Code toggle, responsive size buttons (mobile/desktop), refresh
- **Left panel (~340px fixed):** Chat interface
  - User messages in blue-tinted cards
  - Claude responses with inline activity items (file creates, edits, commands) as collapsible cards with colored left borders (green = complete, yellow = in-progress)
  - Chat input at bottom with yellow send button
- **Right panel (flex):** Live preview iframe pointing at Vite dev server
  - Small URL indicator badge at top showing localhost:5174

## Claude CLI Integration

### Spawning

```
claude --output-format stream-json --verbose -p "<prompt>"
```

Runs with the project directory as cwd so file edits land correctly.

### Conversation Continuity

Use `--resume` with a stored conversation ID per project. Each project stores state in `.lovable-clone/state.json` inside its directory.

### System Prompt

Each project includes a `CLAUDE.md` file in its root that instructs Claude:
- It's building a Vite + React + Tailwind + shadcn/ui app
- Where files live and project structure conventions
- Best practices for the stack

### Stream Event Types

The `stream-json` format emits newline-delimited JSON:
- `assistant` — text chunks (streamed to chat)
- `tool_use` — file edits, bash commands (shown as activity items)
- `result` — tool outputs (shown in expandable detail)
- `error` — errors (shown as red activity items)

## Tech Stack (The Tool Itself)

### Backend
- Node.js + Express
- `ws` for WebSocket
- `child_process.spawn` for Claude CLI and Vite

### Frontend (Chat UI)
- React + TypeScript
- Vite (for building the chat UI)
- Tailwind CSS
- shadcn/ui

### Project Storage
- Plain filesystem
- Each project is a directory under a configurable root (default: `~/lovable-projects/`)
- New projects scaffolded from a bundled template (not `npm create vite` — faster, no network needed)

## Project Structure

```
lovable-clone/
├── package.json
├── server/
│   ├── index.ts              # Express + WebSocket server entry
│   ├── claude-manager.ts     # Spawn/manage Claude CLI subprocess
│   ├── vite-manager.ts       # Spawn/manage Vite dev server
│   └── project-manager.ts    # CRUD projects on filesystem
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── Editor.tsx
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ActivityItem.tsx
│   │   │   ├── PreviewFrame.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── Toolbar.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useProject.ts
│   │   └── lib/
│   │       └── theme.ts
│   ├── vite.config.ts
│   └── tailwind.config.ts
└── templates/
    └── vite-react/           # Pre-built scaffold for new projects
```

## Error Handling

| Scenario | Handling |
|---|---|
| Claude CLI not installed | Check on startup, show error on dashboard |
| Claude not authenticated | Detect auth errors from CLI, prompt user to run `claude login` |
| Vite dev server crashes | Auto-restart, show error toast in UI |
| Vite port in use | Try ports 5174–5184, use first available |
| Claude process hangs | 5-minute timeout, cancel button in UI kills subprocess |
| Prompt sent while Claude is busy | Queue or show "busy" state with stop button |
| Project files corrupted | Vite shows compile errors in preview; Claude can fix on next prompt |
| Multiple projects | V1: one active at a time; switching kills current Vite and spawns new |

## Future Features (Post-V1)

- Supabase integration (skill-based)
- Deploy to Vercel/Netlify (skill-based)
- Built-in code editor panel
- Image upload in chat prompts
- Version history UI
- Project templates / starter library
