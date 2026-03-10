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
3. Backend spawns a new Claude CLI process with `-p "<prompt>"` and `--resume <conversationId>` (one-shot per message, not a long-lived subprocess)
4. Claude CLI streams JSON events back via stdout
5. Backend parses each newline-delimited JSON event and relays via WebSocket to chat UI
6. Chat UI renders streaming text + activity feed items
7. Claude CLI process exits when response is complete; backend emits a `stream_complete` event
8. Vite detects file changes Claude made → HMR → preview auto-updates

### Why This Architecture

- **One URL** — user just opens localhost:3001
- **Native HMR** — preview iframe points directly at Vite, no proxy layer
- **Backend manages lifecycle** — spawns and restarts Vite automatically
- **Simple** — two processes, no CORS config, no service mesh

### WebSocket Protocol

All client↔server communication uses JSON messages over a single WebSocket connection.

**Client → Server:**

```json
{ "type": "send_prompt", "projectId": "my-app", "content": "Add a dark mode toggle" }
{ "type": "cancel", "projectId": "my-app" }
{ "type": "switch_project", "projectId": "other-app" }
```

**Server → Client:**

```json
{ "type": "assistant_text", "content": "I'll add a dark mode..." }
{ "type": "tool_use", "tool": "write_file", "path": "src/ThemeToggle.tsx", "status": "running" }
{ "type": "tool_result", "tool": "write_file", "path": "src/ThemeToggle.tsx", "status": "complete" }
{ "type": "stream_complete" }
{ "type": "error", "message": "Claude CLI exited with code 1" }
{ "type": "vite_status", "status": "ready", "port": 5174 }
```

The backend wraps raw Claude CLI stream-json events into this normalized format. The `stream_complete` event signals the end of a response.

### REST API

Project management uses simple REST endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects (name, id, lastModified) |
| `POST` | `/api/projects` | Create new project `{ name: "my-app" }` |
| `DELETE` | `/api/projects/:id` | Delete project directory |
| `GET` | `/api/projects/:id` | Get project details + conversation history |

Project IDs are kebab-case directory names (e.g., `my-app` → `~/lovable-projects/my-app/`).

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

- **Top toolbar:** Back button, project name, responsive size buttons (mobile/desktop), refresh
- **Left panel (~340px fixed):** Chat interface
  - User messages in blue-tinted cards
  - Claude responses with inline activity items (file creates, edits, commands) as collapsible cards with colored left borders (green = complete, yellow = in-progress)
  - Chat input at bottom with yellow send button
- **Right panel (flex):** Live preview iframe pointing at Vite dev server
  - Small URL indicator badge at top showing localhost:5174

## Claude CLI Integration

### Subprocess Lifecycle

Each user message spawns a **new one-shot CLI process** that exits when the response is complete:

```
claude --output-format stream-json --verbose \
  -p "<user prompt>" \
  --resume <conversationId>
```

- Runs with the project directory as `cwd` so file edits land correctly
- The process streams JSON events to stdout, then exits
- Backend reads stdout line-by-line, parsing and relaying events over WebSocket
- On first message (no conversation yet), omit `--resume`; capture the returned conversation ID from the CLI output and store it

### Conversation Continuity

Each project stores its conversation ID in `.lovable-clone/state.json` inside the project directory:

```json
{ "conversationId": "abc123...", "createdAt": "2026-03-10T..." }
```

The conversation ID is obtained from the first CLI invocation's output and reused via `--resume` on subsequent messages. This gives Claude full context of prior interactions within the project.

### System Prompt

Each project includes a `CLAUDE.md` file in its root that instructs Claude:
- It's building a Vite + React + Tailwind + shadcn/ui app
- Where files live and project structure conventions
- Best practices for the stack

### Stream Event Types

The `stream-json` format emits newline-delimited JSON. The exact event names and structure should be verified against the CLI output at implementation time, but the expected categories are:

- **Text events** — Claude's conversational response, streamed in chunks
- **Tool use events** — file edits, bash commands (shown as activity items)
- **Tool result events** — outputs from tool execution (shown in expandable detail)
- **Error events** — failures (shown as red activity items)

The backend normalizes these into the WebSocket protocol format defined above, abstracting away any CLI-specific event structure.

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

### Build Mode

The chat UI is a React app developed with Vite in `client/`. For production use, it is **pre-built** (`vite build`) and the output is served as static files by Express. During development of the tool itself, the client can run its own Vite dev server on a separate port (e.g., :5173) — but this is a developer concern, not a user concern.

### Project Storage
- Plain filesystem
- Each project is a directory under a configurable root (default: `~/lovable-projects/`)
- New projects scaffolded from a bundled template (not `npm create vite` — faster, no network needed)

### New Project Lifecycle

1. User submits a prompt from the dashboard OR clicks the "+" card
2. Backend creates a new directory under the project root (kebab-case name, auto-generated from prompt or user-specified)
3. Template files are copied from `templates/vite-react/` into the new directory (includes `CLAUDE.md`, `package.json`, `vite.config.ts`, Tailwind config, etc.)
4. Backend runs `npm install` in the project directory (one-time, required for Vite)
5. Backend spawns Vite dev server for the project
6. User is redirected to the Editor screen
7. The initial prompt is sent to Claude (if created from the dashboard prompt input)

For existing projects, clicking a project card navigates to the Editor screen, restarts Vite if needed, and loads conversation history.

### Dependency Management

When Claude runs `npm install <package>` via its bash tool, the backend does not need special handling — Claude manages `package.json` directly. Vite auto-detects new dependencies via its module resolution and typically does not require a restart. If Vite does fail after a dependency change, the error appears in the preview and the user can prompt Claude to fix it.

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
| Multiple projects | V1: one active at a time; switching kills current Vite and spawns new. If Claude is mid-response, the subprocess is killed and the user sees a "generation cancelled" message. Preview shows a loading spinner during the switch. |

## Future Features (Post-V1)

- Supabase integration (skill-based)
- Deploy to Vercel/Netlify (skill-based)
- Built-in code editor panel
- Image upload in chat prompts
- Version history UI
- Project templates / starter library
