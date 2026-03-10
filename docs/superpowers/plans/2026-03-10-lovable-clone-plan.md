# Lovable Clone Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, chat-driven web UI that spawns Claude Code CLI to generate Vite+React apps with live preview.

**Architecture:** Hybrid Node.js backend serves a pre-built React chat UI and manages two subprocesses — Claude CLI (one-shot per message) and a Vite dev server for the generated app's live preview. The browser loads the chat UI from :3001 and an iframe points directly at the Vite server on :5174 for native HMR.

**Tech Stack:** Node.js, Express, ws (WebSocket), React, TypeScript, Vite, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-10-lovable-clone-design.md`

---

## File Structure

```
lovable-clone/
├── package.json                        # Root: scripts to build client + start server
├── tsconfig.json                       # Shared TS base config
├── vitest.config.ts                    # Test runner config
├── .gitignore
├── server/
│   ├── tsconfig.json                   # Server TS config (Node target)
│   ├── index.ts                        # Express + WebSocket entry point
│   ├── project-manager.ts              # CRUD projects on filesystem
│   ├── vite-manager.ts                 # Spawn/restart Vite dev server
│   ├── claude-manager.ts              # Spawn Claude CLI, parse stream-json
│   ├── ws-handler.ts                   # WebSocket message routing
│   └── __tests__/
│       ├── project-manager.test.ts
│       ├── vite-manager.test.ts
│       ├── claude-manager.test.ts
│       └── ws-handler.test.ts
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                    # React entry
│       ├── App.tsx                     # Router: Dashboard | Editor
│       ├── lib/
│       │   └── theme.ts               # Color palette constants
│       ├── hooks/
│       │   ├── useWebSocket.ts         # WS connection + message handling
│       │   └── useProject.ts           # REST API calls for project CRUD
│       ├── pages/
│       │   ├── Dashboard.tsx           # Home: prompt input + project cards
│       │   └── Editor.tsx              # Chat panel + preview iframe
│       └── components/
│           ├── Sidebar.tsx             # Left nav (dashboard)
│           ├── ChatPanel.tsx           # Message list + input
│           ├── ChatMessage.tsx         # Single message (user or assistant)
│           ├── ActivityItem.tsx        # File create/edit/command inline card
│           ├── PreviewFrame.tsx        # Iframe wrapper with toolbar
│           ├── ProjectCard.tsx         # Thumbnail card on dashboard
│           └── Toolbar.tsx             # Top bar in editor
└── templates/
    └── vite-react/                     # Scaffold copied for each new project
        ├── package.json
        ├── tsconfig.json
        ├── tsconfig.app.json
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── postcss.config.js
        ├── index.html
        ├── CLAUDE.md                   # System prompt for Claude
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── index.css
            └── vite-env.d.ts
```

---

## Chunk 1: Project Scaffolding & Template

### Task 1: Initialize monorepo structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `server/tsconfig.json`
- Create: `client/tsconfig.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "lovable-clone",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "cd client && npx vite --port 5173",
    "build:client": "cd client && npx vite build --outDir ../dist/client",
    "start": "npx tsx server/index.ts",
    "dev": "npx tsx watch server/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "."
  },
  "exclude": ["node_modules", "dist", "client", "templates"]
}
```

- [ ] **Step 3: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../dist/server",
    "rootDir": "."
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.superpowers/
*.log
```

- [ ] **Step 5: Run npm install**

Run: `cd "N:/LOVABLE CLONE" && npm install`
Expected: `node_modules/` created, lock file generated.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore server/tsconfig.json
git commit -m "chore: initialize monorepo structure with server/client layout"
```

### Task 2: Create Vite+React project template

**Files:**
- Create: `templates/vite-react/package.json`
- Create: `templates/vite-react/tsconfig.json`
- Create: `templates/vite-react/tsconfig.app.json`
- Create: `templates/vite-react/vite.config.ts`
- Create: `templates/vite-react/tailwind.config.ts`
- Create: `templates/vite-react/postcss.config.js`
- Create: `templates/vite-react/index.html`
- Create: `templates/vite-react/CLAUDE.md`
- Create: `templates/vite-react/src/main.tsx`
- Create: `templates/vite-react/src/App.tsx`
- Create: `templates/vite-react/src/index.css`
- Create: `templates/vite-react/src/vite-env.d.ts`

- [ ] **Step 1: Create template package.json**

```json
{
  "name": "{{PROJECT_NAME}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

Note: `{{PROJECT_NAME}}` is replaced by project-manager at scaffold time.

- [ ] **Step 2: Create template tsconfig files**

`templates/vite-react/tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

`templates/vite-react/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create template Vite + Tailwind config**

`templates/vite-react/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

`templates/vite-react/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

`templates/vite-react/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create template entry files**

`templates/vite-react/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{PROJECT_NAME}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`templates/vite-react/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`templates/vite-react/src/App.tsx`:
```tsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900">
        Welcome to {{PROJECT_NAME}}
      </h1>
    </div>
  )
}

export default App
```

`templates/vite-react/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`templates/vite-react/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 5: Create CLAUDE.md system prompt**

`templates/vite-react/CLAUDE.md`:
```markdown
# Project Context

This is a Vite + React + TypeScript + Tailwind CSS application.

## Stack
- React 19 with TypeScript
- Vite 6 for dev server and build
- Tailwind CSS for styling
- shadcn/ui components (install as needed with npx shadcn@latest add <component>)

## Conventions
- Use functional components with hooks
- Use Tailwind classes for all styling — no CSS modules or styled-components
- Place new components in src/components/
- Place page-level components in src/pages/ (if routing is added)
- Use TypeScript strict mode — no `any` types
- Prefer named exports over default exports for components

## Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Install shadcn component: `npx shadcn@latest add <component>`
```

- [ ] **Step 6: Commit**

```bash
git add templates/
git commit -m "feat: add Vite+React+Tailwind project template for scaffolding"
```

### Task 3: Scaffold the client app (chat UI)

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.ts`
- Create: `client/postcss.config.js`
- Create: `client/tsconfig.json`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/index.css`
- Create: `client/src/App.tsx`
- Create: `client/src/lib/theme.ts`

- [ ] **Step 1: Create client package.json**

```json
{
  "name": "lovable-clone-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc -b && vite build --outDir ../dist/client",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create client Vite + Tailwind config**

`client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
})
```

`client/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0b0f1a',
        surface: '#0e1525',
        card: '#111d33',
        border: '#1c2d47',
        primary: '#5b9cf5',
        accent: '#f5c542',
        success: '#4ade80',
        'text-primary': '#c8cdd8',
        'text-secondary': '#5a6578',
      },
    },
  },
  plugins: [],
} satisfies Config
```

`client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Create client tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create client entry files**

`client/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lovable Clone</title>
  </head>
  <body class="bg-base text-text-primary">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`client/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

`client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`client/src/App.tsx`:
```tsx
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/project/:id" element={<Editor />} />
    </Routes>
  )
}
```

- [ ] **Step 5: Create theme constants**

`client/src/lib/theme.ts`:
```typescript
export const colors = {
  base: '#0b0f1a',
  surface: '#0e1525',
  card: '#111d33',
  border: '#1c2d47',
  primary: '#5b9cf5',
  accent: '#f5c542',
  success: '#4ade80',
  error: '#f38ba8',
  text: '#c8cdd8',
  textSecondary: '#5a6578',
} as const
```

- [ ] **Step 6: Create placeholder pages**

`client/src/pages/Dashboard.tsx`:
```tsx
export default function Dashboard() {
  return <div className="min-h-screen bg-base text-text-primary p-8">Dashboard (placeholder)</div>
}
```

`client/src/pages/Editor.tsx`:
```tsx
export default function Editor() {
  return <div className="min-h-screen bg-base text-text-primary p-8">Editor (placeholder)</div>
}
```

- [ ] **Step 7: Install client dependencies and verify build**

Run: `cd "N:/LOVABLE CLONE/client" && npm install && npx vite build --outDir ../dist/client`
Expected: Build completes, `dist/client/` contains `index.html` and JS/CSS assets.

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: scaffold React chat UI client with routing and theme"
```

---

## Chunk 2: Backend Services

### Task 4: Implement project-manager

**Files:**
- Create: `server/project-manager.ts`
- Create: `server/__tests__/project-manager.test.ts`

- [ ] **Step 1: Write failing tests for project-manager**

`server/__tests__/project-manager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ProjectManager } from '../project-manager.js'

describe('ProjectManager', () => {
  let tmpDir: string
  let pm: ProjectManager

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lovable-test-'))
    pm = new ProjectManager(tmpDir, path.resolve('templates/vite-react'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('lists projects (empty initially)', async () => {
    const projects = await pm.listProjects()
    expect(projects).toEqual([])
  })

  it('creates a project from a name', async () => {
    const project = await pm.createProject('My App')
    expect(project.id).toBe('my-app')
    expect(project.name).toBe('My App')

    const packageJson = await fs.readFile(
      path.join(tmpDir, 'my-app', 'package.json'), 'utf-8'
    )
    expect(JSON.parse(packageJson).name).toBe('my-app')
  })

  it('creates unique IDs for duplicate names', async () => {
    await pm.createProject('My App')
    const second = await pm.createProject('My App')
    expect(second.id).toMatch(/^my-app-\d+$/)
  })

  it('lists created projects sorted by lastModified desc', async () => {
    await pm.createProject('Alpha')
    await pm.createProject('Beta')
    const projects = await pm.listProjects()
    expect(projects).toHaveLength(2)
    expect(projects[0].id).toBe('beta')
    expect(projects[1].id).toBe('alpha')
  })

  it('gets a project by ID', async () => {
    await pm.createProject('My App')
    const project = await pm.getProject('my-app')
    expect(project.name).toBe('My App')
    expect(project.id).toBe('my-app')
  })

  it('throws when getting a nonexistent project', async () => {
    await expect(pm.getProject('nope')).rejects.toThrow()
  })

  it('deletes a project', async () => {
    await pm.createProject('My App')
    await pm.deleteProject('my-app')
    const projects = await pm.listProjects()
    expect(projects).toEqual([])
  })

  it('replaces {{PROJECT_NAME}} in template files', async () => {
    await pm.createProject('Cool App')
    const html = await fs.readFile(
      path.join(tmpDir, 'cool-app', 'index.html'), 'utf-8'
    )
    expect(html).toContain('cool-app')
    expect(html).not.toContain('{{PROJECT_NAME}}')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/project-manager.test.ts`
Expected: All tests FAIL (module not found).

- [ ] **Step 3: Implement project-manager**

`server/project-manager.ts`:
```typescript
import fs from 'fs/promises'
import path from 'path'

export interface Project {
  id: string
  name: string
  path: string
  lastModified: string
}

export class ProjectManager {
  constructor(
    private projectRoot: string,
    private templateDir: string,
  ) {}

  async listProjects(): Promise<Project[]> {
    try {
      const entries = await fs.readdir(this.projectRoot, { withFileTypes: true })
      const projects: Project[] = []

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const metaPath = path.join(this.projectRoot, entry.name, '.lovable-clone', 'meta.json')
        try {
          const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
          const stat = await fs.stat(path.join(this.projectRoot, entry.name))
          projects.push({
            id: entry.name,
            name: meta.name,
            path: path.join(this.projectRoot, entry.name),
            lastModified: stat.mtime.toISOString(),
          })
        } catch {
          // Skip directories without meta — not a lovable project
        }
      }

      return projects.sort(
        (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )
    } catch {
      return []
    }
  }

  async createProject(name: string): Promise<Project> {
    const baseId = this.toKebabCase(name)
    let id = baseId
    let attempt = 0

    while (true) {
      const projectPath = path.join(this.projectRoot, id)
      try {
        await fs.access(projectPath)
        // Directory exists, try next
        attempt++
        id = `${baseId}-${attempt}`
      } catch {
        // Directory does not exist — use this id
        break
      }
    }

    const projectPath = path.join(this.projectRoot, id)
    await this.copyTemplate(projectPath, id)

    // Write meta file
    const metaDir = path.join(projectPath, '.lovable-clone')
    await fs.mkdir(metaDir, { recursive: true })
    await fs.writeFile(
      path.join(metaDir, 'meta.json'),
      JSON.stringify({ name, createdAt: new Date().toISOString() }),
    )

    const stat = await fs.stat(projectPath)
    return { id, name, path: projectPath, lastModified: stat.mtime.toISOString() }
  }

  async getProject(id: string): Promise<Project> {
    const projectPath = path.join(this.projectRoot, id)
    const metaPath = path.join(projectPath, '.lovable-clone', 'meta.json')

    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    const stat = await fs.stat(projectPath)
    return { id, name: meta.name, path: projectPath, lastModified: stat.mtime.toISOString() }
  }

  async deleteProject(id: string): Promise<void> {
    const projectPath = path.join(this.projectRoot, id)
    await fs.rm(projectPath, { recursive: true, force: true })
  }

  private async copyTemplate(dest: string, projectName: string): Promise<void> {
    await this.copyDir(this.templateDir, dest, projectName)
  }

  private async copyDir(src: string, dest: string, projectName: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath, projectName)
      } else {
        let content = await fs.readFile(srcPath, 'utf-8')
        content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName)
        await fs.writeFile(destPath, content)
      }
    }
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/project-manager.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/project-manager.ts server/__tests__/project-manager.test.ts
git commit -m "feat: implement project-manager with CRUD and template scaffolding"
```

### Task 5: Implement vite-manager

**Files:**
- Create: `server/vite-manager.ts`
- Create: `server/__tests__/vite-manager.test.ts`

- [ ] **Step 1: Write failing tests for vite-manager**

`server/__tests__/vite-manager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ViteManager } from '../vite-manager.js'

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const proc = {
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
    }
    return proc
  }),
}))

describe('ViteManager', () => {
  let vm: ViteManager

  beforeEach(() => {
    vm = new ViteManager()
  })

  it('starts with no active server', () => {
    expect(vm.getStatus()).toEqual({ running: false, port: null, projectId: null })
  })

  it('starts a vite server for a project', async () => {
    await vm.start('/path/to/project', 'my-app')
    const status = vm.getStatus()
    expect(status.running).toBe(true)
    expect(status.projectId).toBe('my-app')
    expect(status.port).toBeGreaterThanOrEqual(5174)
  })

  it('stops the current server', async () => {
    await vm.start('/path/to/project', 'my-app')
    vm.stop()
    expect(vm.getStatus().running).toBe(false)
  })

  it('restarts when switching projects', async () => {
    await vm.start('/path/to/project-a', 'app-a')
    await vm.start('/path/to/project-b', 'app-b')
    expect(vm.getStatus().projectId).toBe('app-b')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/vite-manager.test.ts`
Expected: All tests FAIL.

- [ ] **Step 3: Implement vite-manager**

`server/vite-manager.ts`:
```typescript
import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

interface ViteStatus {
  running: boolean
  port: number | null
  projectId: string | null
}

export class ViteManager extends EventEmitter {
  private process: ChildProcess | null = null
  private port: number | null = null
  private projectId: string | null = null
  private static BASE_PORT = 5174
  private static MAX_PORT = 5184

  getStatus(): ViteStatus {
    return {
      running: this.process !== null,
      port: this.port,
      projectId: this.projectId,
    }
  }

  async start(projectPath: string, projectId: string): Promise<number> {
    // Stop existing server if running
    if (this.process) {
      this.stop()
    }

    this.port = await this.findAvailablePort()
    this.projectId = projectId

    this.process = spawn('npx', ['vite', '--port', String(this.port), '--host'], {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      if (output.includes('Local:') || output.includes('ready in')) {
        this.emit('ready', { port: this.port, projectId })
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('error', { message: data.toString(), projectId })
    })

    this.process.on('exit', (code) => {
      const crashedProjectPath = projectPath
      const crashedProjectId = projectId
      const crashedPort = this.port
      this.process = null

      if (code !== null && code !== 0) {
        this.emit('crash', { code, projectId: crashedProjectId })
        // Auto-restart after 2 seconds on crash
        setTimeout(async () => {
          try {
            console.log(`🔄 Auto-restarting Vite for ${crashedProjectId}...`)
            await this.start(crashedProjectPath, crashedProjectId)
          } catch (err) {
            console.error('Failed to auto-restart Vite:', err)
          }
        }, 2000)
      }
    })

    return this.port
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.port = null
      this.projectId = null
    }
  }

  private async findAvailablePort(): Promise<number> {
    const net = await import('net')
    for (let port = ViteManager.BASE_PORT; port <= ViteManager.MAX_PORT; port++) {
      const available = await new Promise<boolean>((resolve) => {
        const server = net.createServer()
        server.once('error', () => resolve(false))
        server.once('listening', () => {
          server.close(() => resolve(true))
        })
        server.listen(port, '127.0.0.1')
      })
      if (available) return port
    }
    throw new Error('No available ports in range 5174-5184')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/vite-manager.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/vite-manager.ts server/__tests__/vite-manager.test.ts
git commit -m "feat: implement vite-manager with port scanning and lifecycle"
```

### Task 6: Implement claude-manager

**Files:**
- Create: `server/claude-manager.ts`
- Create: `server/__tests__/claude-manager.test.ts`

- [ ] **Step 1: Write failing tests for claude-manager**

`server/__tests__/claude-manager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeManager, type ClaudeEvent } from '../claude-manager.js'

// Mock child_process.spawn
const mockStdout = { on: vi.fn() }
const mockStderr = { on: vi.fn() }
const mockProcess = {
  pid: 99999,
  stdout: mockStdout,
  stderr: mockStderr,
  on: vi.fn(),
  kill: vi.fn(),
}

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProcess),
}))

describe('ClaudeManager', () => {
  let cm: ClaudeManager

  beforeEach(() => {
    vi.clearAllMocks()
    cm = new ClaudeManager()
  })

  it('starts not busy', () => {
    expect(cm.isBusy()).toBe(false)
  })

  it('becomes busy when sending a prompt', () => {
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined)
    expect(cm.isBusy()).toBe(true)
  })

  it('can cancel a running process', () => {
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined)
    cm.cancel()
    expect(mockProcess.kill).toHaveBeenCalled()
    expect(cm.isBusy()).toBe(false)
  })

  it('emits events callback for each parsed line', () => {
    const events: ClaudeEvent[] = []
    cm.sendPrompt('/path/to/project', 'my-app', 'Hello', undefined, (event) => {
      events.push(event)
    })

    // Simulate stdout data from the mock
    const stdoutHandler = mockStdout.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'data'
    )?.[1]
    expect(stdoutHandler).toBeDefined()

    // Simulate a stream-json line
    stdoutHandler(Buffer.from('{"type":"assistant","message":{"content":[{"type":"text","text":"Hello!"}]}}\n'))

    expect(events.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/claude-manager.test.ts`
Expected: All tests FAIL.

- [ ] **Step 3: Implement claude-manager**

`server/claude-manager.ts`:
```typescript
import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export type ClaudeEvent =
  | { type: 'assistant_text'; content: string }
  | { type: 'tool_use'; tool: string; path?: string; status: 'running' }
  | { type: 'tool_result'; tool: string; path?: string; status: 'complete' | 'error'; output?: string }
  | { type: 'stream_complete' }
  | { type: 'error'; message: string }

export class ClaudeManager {
  private process: ChildProcess | null = null
  private buffer = ''
  private timeout: ReturnType<typeof setTimeout> | null = null
  private static TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

  isBusy(): boolean {
    return this.process !== null
  }

  sendPrompt(
    projectPath: string,
    projectId: string,
    prompt: string,
    conversationId: string | undefined,
    onEvent?: (event: ClaudeEvent) => void,
  ): void {
    if (this.process) {
      throw new Error('Claude is busy — cancel or wait for completion')
    }

    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
    ]

    if (conversationId) {
      args.push('--resume', conversationId)
    }

    this.process = spawn('claude', args, {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this.buffer = ''
    let capturedConversationId: string | undefined

    // 5-minute timeout — kill the process if it hangs
    this.timeout = setTimeout(() => {
      if (this.process) {
        onEvent?.({ type: 'error', message: 'Claude CLI timed out after 5 minutes' })
        this.cancel()
      }
    }, ClaudeManager.TIMEOUT_MS)

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString()
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? '' // Keep incomplete last line in buffer

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const raw = JSON.parse(line)

          // Capture conversation ID from result event
          if (raw.type === 'result' && raw.session_id) {
            capturedConversationId = raw.session_id
          }

          const events = this.parseRawEvent(raw)
          for (const event of events) {
            onEvent?.(event)
          }
        } catch {
          // Skip unparseable lines
        }
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim()
      if (message) {
        // Detect authentication errors
        if (message.includes('not authenticated') || message.includes('login') || message.includes('auth')) {
          onEvent?.({ type: 'error', message: `Authentication error: ${message}. Run \`claude login\` in your terminal.` })
        } else {
          onEvent?.({ type: 'error', message })
        }
      }
    })

    this.process.on('exit', async (code) => {
      if (this.timeout) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this.process = null
      this.buffer = ''

      if (code !== 0 && code !== null) {
        onEvent?.({ type: 'error', message: `Claude CLI exited with code ${code}` })
      }

      onEvent?.({ type: 'stream_complete' })

      // Save conversation ID if captured
      if (capturedConversationId) {
        await this.saveConversationId(projectPath, capturedConversationId)
      }
    })
  }

  cancel(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.buffer = ''
    }
  }

  private parseRawEvent(raw: Record<string, unknown>): ClaudeEvent[] {
    const events: ClaudeEvent[] = []
    const type = raw.type as string

    // Handle top-level message types from CLI stream-json
    if (type === 'assistant') {
      const message = raw.message as Record<string, unknown> | undefined
      if (message?.content && Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text' && block.text) {
            events.push({ type: 'assistant_text', content: block.text })
          }
          if (block.type === 'tool_use') {
            events.push({
              type: 'tool_use',
              tool: block.name ?? 'unknown',
              path: this.extractPath(block.input),
              status: 'running',
            })
          }
        }
      }
    }

    if (type === 'result') {
      const message = raw.result as Record<string, unknown> | undefined
      if (message) {
        // result events often contain tool outputs
        events.push({
          type: 'tool_result',
          tool: (message.tool_name as string) ?? 'unknown',
          status: 'complete',
          output: message.output as string | undefined,
        })
      }
    }

    return events
  }

  private extractPath(input: unknown): string | undefined {
    if (typeof input === 'object' && input !== null) {
      const obj = input as Record<string, unknown>
      return (obj.file_path ?? obj.path ?? obj.command) as string | undefined
    }
    return undefined
  }

  private async saveConversationId(projectPath: string, conversationId: string): Promise<void> {
    const stateDir = path.join(projectPath, '.lovable-clone')
    const statePath = path.join(stateDir, 'state.json')

    await fs.mkdir(stateDir, { recursive: true })
    await fs.writeFile(statePath, JSON.stringify({
      conversationId,
      createdAt: new Date().toISOString(),
    }))
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/claude-manager.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/claude-manager.ts server/__tests__/claude-manager.test.ts
git commit -m "feat: implement claude-manager with stream-json parsing and cancel"
```

---

## Chunk 3: Backend Server

### Task 7: Implement WebSocket handler

**Files:**
- Create: `server/ws-handler.ts`
- Create: `server/__tests__/ws-handler.test.ts`

- [ ] **Step 1: Write failing tests for ws-handler**

`server/__tests__/ws-handler.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleMessage, type WsContext } from '../ws-handler.js'

describe('ws-handler', () => {
  let mockContext: WsContext

  beforeEach(() => {
    mockContext = {
      projectManager: {
        createProject: vi.fn().mockResolvedValue({ id: 'my-app', name: 'My App', path: '/tmp/my-app', lastModified: '' }),
        getProject: vi.fn().mockResolvedValue({ id: 'my-app', name: 'My App', path: '/tmp/my-app', lastModified: '' }),
      } as any,
      claudeManager: {
        isBusy: vi.fn().mockReturnValue(false),
        sendPrompt: vi.fn(),
        cancel: vi.fn(),
      } as any,
      viteManager: {
        start: vi.fn().mockResolvedValue(5174),
        stop: vi.fn(),
        getStatus: vi.fn().mockReturnValue({ running: false, port: null, projectId: null }),
      } as any,
      send: vi.fn(),
    }
  })

  it('handles send_prompt by starting Claude', async () => {
    await handleMessage(
      JSON.stringify({ type: 'send_prompt', projectId: 'my-app', content: 'Hello' }),
      mockContext,
    )
    expect(mockContext.claudeManager.sendPrompt).toHaveBeenCalled()
  })

  it('handles cancel by stopping Claude', async () => {
    await handleMessage(
      JSON.stringify({ type: 'cancel', projectId: 'my-app' }),
      mockContext,
    )
    expect(mockContext.claudeManager.cancel).toHaveBeenCalled()
  })

  it('rejects send_prompt when Claude is busy', async () => {
    (mockContext.claudeManager.isBusy as any).mockReturnValue(true)
    await handleMessage(
      JSON.stringify({ type: 'send_prompt', projectId: 'my-app', content: 'Hello' }),
      mockContext,
    )
    expect(mockContext.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"error"')
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/ws-handler.test.ts`
Expected: All tests FAIL.

- [ ] **Step 3: Implement ws-handler**

`server/ws-handler.ts`:
```typescript
import type { ProjectManager } from './project-manager.js'
import type { ViteManager } from './vite-manager.js'
import type { ClaudeManager, ClaudeEvent } from './claude-manager.js'

export interface WsContext {
  projectManager: ProjectManager
  claudeManager: ClaudeManager
  viteManager: ViteManager
  send: (data: string) => void
}

interface ClientMessage {
  type: 'send_prompt' | 'cancel' | 'switch_project'
  projectId: string
  content?: string
}

export async function handleMessage(raw: string, ctx: WsContext): Promise<void> {
  let msg: ClientMessage
  try {
    msg = JSON.parse(raw)
  } catch {
    ctx.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
    return
  }

  switch (msg.type) {
    case 'send_prompt':
      await handleSendPrompt(msg, ctx)
      break
    case 'cancel':
      ctx.claudeManager.cancel()
      ctx.send(JSON.stringify({ type: 'stream_complete' }))
      break
    case 'switch_project':
      await handleSwitchProject(msg, ctx)
      break
    default:
      ctx.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${(msg as any).type}` }))
  }
}

async function handleSendPrompt(msg: ClientMessage, ctx: WsContext): Promise<void> {
  if (ctx.claudeManager.isBusy()) {
    ctx.send(JSON.stringify({ type: 'error', message: 'Claude is busy. Cancel or wait.' }))
    return
  }

  if (!msg.content?.trim()) {
    ctx.send(JSON.stringify({ type: 'error', message: 'Empty prompt' }))
    return
  }

  const project = await ctx.projectManager.getProject(msg.projectId)

  // Ensure Vite is running for this project
  const viteStatus = ctx.viteManager.getStatus()
  if (!viteStatus.running || viteStatus.projectId !== msg.projectId) {
    const port = await ctx.viteManager.start(project.path, msg.projectId)
    ctx.send(JSON.stringify({ type: 'vite_status', status: 'ready', port }))
  }

  // Read conversation ID if it exists
  const fs = await import('fs/promises')
  const path = await import('path')
  let conversationId: string | undefined
  try {
    const statePath = path.join(project.path, '.lovable-clone', 'state.json')
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'))
    conversationId = state.conversationId ?? undefined
  } catch {
    // No state yet
  }

  ctx.claudeManager.sendPrompt(
    project.path,
    msg.projectId,
    msg.content,
    conversationId,
    (event: ClaudeEvent) => {
      ctx.send(JSON.stringify(event))
    },
  )
}

async function handleSwitchProject(msg: ClientMessage, ctx: WsContext): Promise<void> {
  // Cancel any running Claude process
  if (ctx.claudeManager.isBusy()) {
    ctx.claudeManager.cancel()
  }

  const project = await ctx.projectManager.getProject(msg.projectId)
  const port = await ctx.viteManager.start(project.path, msg.projectId)
  ctx.send(JSON.stringify({ type: 'vite_status', status: 'ready', port }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "N:/LOVABLE CLONE" && npx vitest run server/__tests__/ws-handler.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/ws-handler.ts server/__tests__/ws-handler.test.ts
git commit -m "feat: implement WebSocket message handler with routing"
```

### Task 8: Implement Express server entry point

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Implement server entry**

`server/index.ts`:
```typescript
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import path from 'path'
import { ProjectManager } from './project-manager.js'
import { ViteManager } from './vite-manager.js'
import { ClaudeManager } from './claude-manager.js'
import { handleMessage, type WsContext } from './ws-handler.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const PROJECT_ROOT = process.env.PROJECT_ROOT ?? path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? '.',
  'lovable-projects',
)
const TEMPLATE_DIR = path.resolve(process.cwd(), 'templates', 'vite-react')

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

// Services
const projectManager = new ProjectManager(PROJECT_ROOT, TEMPLATE_DIR)
const viteManager = new ViteManager()
const claudeManager = new ClaudeManager()

// JSON body parsing
app.use(express.json())

// REST API
app.get('/api/projects', async (_req, res) => {
  const projects = await projectManager.listProjects()
  res.json(projects)
})

app.post('/api/projects', async (req, res) => {
  const { name } = req.body
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const project = await projectManager.createProject(name)
  res.status(201).json(project)
})

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id)
    res.json(project)
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    viteManager.stop() // Stop vite if running this project
    await projectManager.deleteProject(req.params.id)
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

// Serve built client (production mode)
const clientDist = path.resolve(process.cwd(), 'dist', 'client')
app.use(express.static(clientDist))

// SPA fallback — serve index.html for client routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// WebSocket
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected')

  const ctx: WsContext = {
    projectManager,
    claudeManager,
    viteManager,
    send: (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    },
  }

  ws.on('message', async (data) => {
    try {
      await handleMessage(data.toString(), ctx)
    } catch (err) {
      ctx.send(JSON.stringify({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

// Startup checks
async function checkClaude(): Promise<boolean> {
  const { execSync } = await import('child_process')
  try {
    execSync('claude --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function ensureProjectRoot(): Promise<void> {
  const fs = await import('fs/promises')
  await fs.mkdir(PROJECT_ROOT, { recursive: true })
}

async function start(): Promise<void> {
  await ensureProjectRoot()

  const claudeOk = await checkClaude()
  if (!claudeOk) {
    console.warn('⚠️  Claude CLI not found. Install it or ensure it is in PATH.')
  }

  server.listen(PORT, () => {
    console.log(`⚡ Lovable Clone running at http://localhost:${PORT}`)
    console.log(`📁 Projects stored in ${PROJECT_ROOT}`)
    console.log(`🤖 Claude CLI: ${claudeOk ? '✓ found' : '✗ not found'}`)
  })
}

start()
```

- [ ] **Step 2: Verify server starts**

Run: `cd "N:/LOVABLE CLONE" && npx tsx server/index.ts`
Expected: Console shows "Lovable Clone running at http://localhost:3001". Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat: implement Express + WebSocket server entry point"
```

---

## Chunk 4: Frontend — Dashboard & Editor

### Task 9: Implement useWebSocket hook

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Implement useWebSocket**

`client/src/hooks/useWebSocket.ts`:
```typescript
import { useEffect, useRef, useState, useCallback } from 'react'

export type ServerEvent =
  | { type: 'assistant_text'; content: string }
  | { type: 'tool_use'; tool: string; path?: string; status: 'running' }
  | { type: 'tool_result'; tool: string; path?: string; status: 'complete' | 'error'; output?: string }
  | { type: 'stream_complete' }
  | { type: 'error'; message: string }
  | { type: 'vite_status'; status: string; port: number }

export function useWebSocket(onEvent: (event: ServerEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onEventRef.current = onEvent

  useEffect(() => {
    let unmounted = false

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        // Auto-reconnect after 2 seconds unless unmounted
        if (!unmounted) {
          reconnectTimerRef.current = setTimeout(connect, 2000)
        }
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerEvent
          onEventRef.current(data)
        } catch {
          // Ignore unparseable messages
        }
      }
    }

    connect()

    return () => {
      unmounted = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      wsRef.current?.close()
    }
  }, [])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { connected, send }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useWebSocket.ts
git commit -m "feat: implement useWebSocket hook with auto-reconnect"
```

### Task 10: Implement useProject hook

**Files:**
- Create: `client/src/hooks/useProject.ts`

- [ ] **Step 1: Implement useProject**

`client/src/hooks/useProject.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react'

export interface Project {
  id: string
  name: string
  path: string
  lastModified: string
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const project = await res.json()
    await fetchProjects()
    return project
  }, [fetchProjects])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await fetchProjects()
  }, [fetchProjects])

  return { projects, loading, createProject, deleteProject, refetch: fetchProjects }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useProject.ts
git commit -m "feat: implement useProject hook for REST API"
```

### Task 11: Implement Dashboard page

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`
- Create: `client/src/components/Sidebar.tsx`
- Create: `client/src/components/ProjectCard.tsx`

- [ ] **Step 1: Implement Sidebar component**

`client/src/components/Sidebar.tsx`:
```tsx
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
```

- [ ] **Step 2: Implement ProjectCard component**

`client/src/components/ProjectCard.tsx`:
```tsx
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
```

- [ ] **Step 3: Implement Dashboard page**

`client/src/pages/Dashboard.tsx`:
```tsx
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
```

- [ ] **Step 4: Verify client builds**

Run: `cd "N:/LOVABLE CLONE/client" && npx vite build --outDir ../dist/client`
Expected: Build completes successfully.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx client/src/components/Sidebar.tsx client/src/components/ProjectCard.tsx
git commit -m "feat: implement Dashboard page with sidebar, prompt input, project cards"
```

### Task 12: Implement Editor page with chat and preview

**Files:**
- Create: `client/src/components/ChatPanel.tsx`
- Create: `client/src/components/ChatMessage.tsx`
- Create: `client/src/components/ActivityItem.tsx`
- Create: `client/src/components/PreviewFrame.tsx`
- Create: `client/src/components/Toolbar.tsx`
- Modify: `client/src/pages/Editor.tsx`

- [ ] **Step 1: Implement ActivityItem**

`client/src/components/ActivityItem.tsx`:
```tsx
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
```

- [ ] **Step 2: Implement ChatMessage**

`client/src/components/ChatMessage.tsx`:
```tsx
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
```

- [ ] **Step 3: Implement ChatPanel**

`client/src/components/ChatPanel.tsx`:
```tsx
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
```

- [ ] **Step 4: Implement PreviewFrame**

`client/src/components/PreviewFrame.tsx`:
```tsx
interface PreviewFrameProps {
  port: number | null
}

export default function PreviewFrame({ port }: PreviewFrameProps) {
  if (!port) {
    return (
      <div className="flex-1 bg-[#f0f2f5] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🌐</div>
          <div className="text-lg font-semibold text-gray-600">Waiting for preview...</div>
          <div className="text-sm mt-1">Send a prompt to start building</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[rgba(11,15,26,0.85)] text-primary px-2.5 py-0.5 rounded text-[10px] z-10">
        localhost:{port}
      </div>
      <iframe
        src={`http://localhost:${port}`}
        className="w-full h-full border-0"
        title="App Preview"
      />
    </div>
  )
}
```

- [ ] **Step 5: Implement Toolbar**

`client/src/components/Toolbar.tsx`:
```tsx
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
```

- [ ] **Step 6: Implement Editor page (wiring everything together)**

`client/src/pages/Editor.tsx`:
```tsx
import { useState, useCallback, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import ChatPanel, { type Message } from '../components/ChatPanel'
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
      send({ type: 'send_prompt', projectId, content: initialPrompt })
    }, 500)
  }

  const handleSendPrompt = (content: string) => {
    if (!projectId) return
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content }])
    setIsStreaming(true)
    send({ type: 'send_prompt', projectId, content })
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
          onSendPrompt={handleSendPrompt}
          onCancel={handleCancel}
        />
        <PreviewFrame port={previewPort} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verify client builds**

Run: `cd "N:/LOVABLE CLONE/client" && npx vite build --outDir ../dist/client`
Expected: Build completes successfully.

- [ ] **Step 8: Commit**

```bash
git add client/src/
git commit -m "feat: implement Editor page with chat panel, preview iframe, and toolbar"
```

---

## Chunk 5: Integration & Polish

### Task 13: End-to-end wiring test

- [ ] **Step 1: Build the client**

Run: `cd "N:/LOVABLE CLONE/client" && npm install && npx vite build --outDir ../dist/client`
Expected: `dist/client/` contains the built app.

- [ ] **Step 2: Start the server**

Run: `cd "N:/LOVABLE CLONE" && npx tsx server/index.ts`
Expected: Console shows the server is running at http://localhost:3001.

- [ ] **Step 3: Verify dashboard loads**

Open http://localhost:3001 in browser.
Expected: Dashboard page renders with prompt input and empty project list.

- [ ] **Step 4: Test project creation**

Type "Hello World App" in the prompt and press Enter.
Expected: Redirects to /project/hello-world-app. Chat shows the prompt. If Claude CLI is available, streaming begins. If not, error message appears.

- [ ] **Step 5: Verify preview loads**

After Claude generates some files, the preview iframe should show the Vite dev server output.
Expected: Preview iframe shows the generated app (or Vite's default page if minimal content).

- [ ] **Step 6: Document any issues found and fix them**

Address any integration issues discovered during manual testing. Common fixes:
- Path resolution on Windows (use `path.resolve` consistently)
- WebSocket URL construction in client
- CORS issues between iframe and parent

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: integration fixes from end-to-end testing"
```

### Task 14: Add npm install step to project creation

- [ ] **Step 1: Update project-manager to run npm install after scaffolding**

Add a method to `server/project-manager.ts` that runs `npm install` in the project directory after template copy. This is called by the WebSocket handler when a new project is created (before Vite starts).

```typescript
async installDependencies(projectPath: string): Promise<void> {
  const { execSync } = await import('child_process')
  execSync('npm install', { cwd: projectPath, stdio: 'pipe' })
}
```

- [ ] **Step 2: Wire into the server flow**

Update `server/index.ts` POST `/api/projects` to call `await projectManager.installDependencies(project.path)` after creation. Note: this makes project creation slower (~10-20 seconds) but is required for Vite to work.

- [ ] **Step 3: Commit**

```bash
git add server/project-manager.ts server/index.ts
git commit -m "feat: run npm install on project creation for Vite compatibility"
```

### Task 15: Add startup validation script

- [ ] **Step 1: Add a start script to root package.json**

Update `package.json` scripts:
```json
{
  "start": "npx tsx server/index.ts",
  "dev": "npx tsx watch server/index.ts"
}
```

- [ ] **Step 2: Verify full startup**

Run: `cd "N:/LOVABLE CLONE" && npm start`
Expected: Server starts, serves the built client, and is ready for WebSocket connections.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: finalize start scripts for production and development"
```
