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
