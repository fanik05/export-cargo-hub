<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Overview
Export Cargo Hub: A B2B export shipment & documentation platform built for air and ocean freight logistics.

## Tech Stack & Architecture
- Framework: Next.js 15+ (App Router, Server Actions, Route Handlers)
- Styling: Tailwind CSS + shadcn/ui components
- State Management: Zustand (client state) + TanStack Table (data grids)
- Database & ORM: PostgreSQL via Prisma ORM
- Validation: Zod schemas for all mutations and API ingress

## Core Conventions & Rules
1. Server vs Client: Default to Server Components. Only mark components with `"use client"` if they require client hooks, event handlers, or local interactivity.
2. Data Access: All database queries must run through the `prisma` singleton located at `@/lib/prisma`. Never instantiate `new PrismaClient()` in route handlers.
3. Forms & Actions: Use Next.js Server Actions (`actions/`) with Zod validation for creates/updates. Use Route Handlers (`app/api/`) only for file downloads (PDFs) or public tracking endpoints.
4. UI Consistency: Always check `components/ui/` for existing shadcn primitives before writing custom buttons, modals, or inputs.
5. Absolute Imports: Always use the `@/*` alias for imports (e.g., `@/components/...`, `@/lib/...`).

## Essential Commands
- Run dev server: `npm run dev`
- Push database schema changes: `npx prisma db push`
- Open DB visualizer: `npx prisma studio`
- Run linting: `npm run lint`

## What NOT To Do
- DO NOT use the legacy Pages Router (`pages/` directory).
- DO NOT query the database directly inside client components.
- DO NOT introduce arbitrary external CSS or styling libraries outside Tailwind CSS.