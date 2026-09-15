# Export Cargo Hub

A B2B export shipment & documentation platform for air and ocean freight logistics.

> **Status: early scaffold.** The Next.js app, Tailwind/shadcn theming, and the
> Prisma/Postgres dependencies are wired up, but the domain features (shipments,
> documents, tracking) have not been built yet. `app/page.tsx` is still the
> starter page. See [Current state](#current-state) for exactly what exists.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-lyra` style, neutral base) |
| Icons | Phosphor Icons (`@phosphor-icons/react`) |
| Primitives | Base UI (`@base-ui/react`) |
| Database | PostgreSQL via Prisma ORM with the `pg` driver adapter |
| Client state | Zustand *(planned — not yet installed)* |
| Data grids | TanStack Table *(planned — not yet installed)* |
| Validation | Zod for every mutation and API ingress *(planned — not yet installed)* |

## Prerequisites

- Node.js 20+ (developed on 24.x)
- npm 10+
- A reachable PostgreSQL database

## Getting started

```bash
npm install
```

Create a `.env` in the repo root (it is gitignored — never commit it):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/export_cargo_hub"
```

Once a Prisma schema exists, sync it to the database:

```bash
npx prisma db push
```

Then start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npx prisma db push` | Push schema changes to the database |
| `npx prisma studio` | Open the database visualizer |

## Project structure

```
app/                  App Router routes, layouts, and global styles
  layout.tsx          Root layout: fonts (Geist, JetBrains Mono) + globals.css
  globals.css         Tailwind v4 entry, shadcn theme tokens, dark variant
  page.tsx            Landing page (still the create-next-app starter)
components/ui/        shadcn primitives (currently: button)
lib/utils.ts          Shared helpers (re-exports `cn`)
public/               Static assets
AGENTS.md             Conventions for AI coding agents (also loaded as CLAUDE.md)
```

Imports use the `@/*` alias, which maps to the **repo root** — so
`@/components/ui/button`, `@/lib/utils`. There is no `src/` directory.

Directories that the conventions assume but that do not exist yet:
`actions/` (Server Actions), `app/api/` (Route Handlers), `prisma/schema.prisma`,
and `lib/prisma.ts` (the Prisma client singleton).

## Conventions

These are enforced by review and by [AGENTS.md](AGENTS.md) — read that file before
contributing:

1. **Server-first.** Default to Server Components. Add `"use client"` only for
   hooks, event handlers, or local interactivity.
2. **One Prisma client.** All queries go through the singleton at `@/lib/prisma`.
   Never `new PrismaClient()` inside a route handler.
3. **Mutations are Server Actions.** Creates and updates live in `actions/` and
   validate their input with Zod. Route Handlers (`app/api/`) are reserved for
   file downloads (PDFs) and public tracking endpoints.
4. **Reuse the UI kit.** Check `components/ui/` for an existing shadcn primitive
   before writing a custom button, modal, or input.
5. **Absolute imports only.** Always use the `@/*` alias.
6. **No Pages Router**, no DB access from client components, and no styling
   libraries outside Tailwind.

## Current state

Present and working:

- Next.js 16 App Router skeleton with the root layout, fonts, and Tailwind v4
- shadcn/ui configured (`components.json`) with the Button primitive installed
- Prisma 8 CLI, `@prisma/client`, and the `@prisma/adapter-pg` driver adapter as
  dependencies

Not built yet:

- Prisma schema and migrations — no data model exists
- The Prisma client singleton at `lib/prisma.ts`
- Any shipment, document, or tracking feature, route, or Server Action
- Zustand, TanStack Table, and Zod are named in the architecture but are not
  installed

Suggested first steps: define `prisma/schema.prisma`, add the `lib/prisma.ts`
singleton using the `pg` adapter, then build the first shipment route.
