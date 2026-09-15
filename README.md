# Export Cargo Hub

A B2B export shipment & documentation platform for air and ocean freight logistics.

> **Status: v1 shipment tracking is implemented.** There are three surfaces:
> a public tracking page (by tracking number or by share link), a public JSON
> tracking endpoint, and an admin app for managing shipments, events, and
> other admin users. See [Current state](#current-state) for details.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-lyra` style, neutral base) |
| Icons | Phosphor Icons (`@phosphor-icons/react`) |
| Primitives | Base UI (`@base-ui/react`) |
| Database | PostgreSQL via Prisma ORM with the `pg` driver adapter |
| Validation | Zod for every mutation and API ingress |
| Testing | Vitest (unit tests always run; integration tests need a test database) |

Zustand and TanStack Table were named in the original architecture notes but
are **not used in v1** — there's no client-side grid state that needs them
yet.

## Prerequisites

- Node.js 22.12+ (developed on 24.x)
- npm 10+
- A reachable PostgreSQL database

## Getting started

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your Postgres connection string
- `SESSION_SECRET` — 32+ random bytes, e.g. `openssl rand -base64 48`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — the first admin account,
  created by the seed script

Then generate the Prisma client, push the schema, and seed the first admin:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

The app runs at http://localhost:3000. Sign in at `/login` with the
`ADMIN_*` credentials from `.env`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm test` | Run the Vitest suite (`vitest run`) |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client into `lib/generated/prisma` |
| `npm run db:seed` | Seed the first admin user (`prisma/seed.ts`) |
| `npx prisma studio` | Open the database visualizer |

### Enabling integration tests

Unit tests (`tests/unit/`) always run. Integration tests (`tests/integration/`)
talk to a real database and are skipped unless `TEST_DATABASE_URL` is set in
`.env`. To enable them, point it at a disposable database (its tables get
truncated between tests) and push the schema to it once:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push
```

After that, `npm test` will exercise the integration suites too.

## Project structure

```
app/                          App Router routes, layouts, and global styles
  (public)/                   Public route group: landing page, tracking pages
    page.tsx                  Landing page — enter a tracking number
    track/[trackingNumber]/   Tracking page by tracking number
    t/[shareToken]/           Tracking page by share link
  (admin)/admin/              Admin route group (session-gated)
    page.tsx                  Shipment list
    shipments/new/            Create a shipment
    shipments/[id]/           Shipment detail: edit, events, share link, delete
    users/                    Manage admin users
    error.tsx                 Admin-scoped error boundary
  api/track/[trackingNumber]/ Public JSON tracking endpoint
  login/                      Admin sign-in
  error.tsx                   Root error boundary
  layout.tsx                  Root layout: fonts + globals.css
  globals.css                 Tailwind v4 entry, shadcn theme tokens, dark variant
actions/                      Server Actions (auth, shipments, events, users) — Zod-validated
components/
  ui/                         shadcn primitives
  admin/                      Admin forms, tables, and controls
  tracking/                   Public tracking UI (status badge, timeline, search)
lib/
  prisma.ts                   Prisma client singleton (never `new PrismaClient()` elsewhere)
  session.ts                  JWT session cookie helpers
  dal.ts                      Data-access-layer guards (require an authenticated admin)
  auth/credentials.ts         Password hashing/verification
  shipments/                  Shipment + event services, cache revalidation
  tracking/                   Tracking number/share token generation, status derivation, public shape
  validation/                 Zod schemas for auth, shipment, event, user, and generic forms
  generated/prisma/           Generated Prisma client (gitignored, rebuilt by `db:generate`)
prisma/
  schema.prisma               Data model
  seed.ts                     Seeds the first admin user
tests/
  unit/                       Pure-function tests (always run)
  integration/                Service-layer tests against a real database (need `TEST_DATABASE_URL`)
AGENTS.md                     Conventions for AI coding agents (also loaded as CLAUDE.md)
```

Imports use the `@/*` alias, which maps to the **repo root** — so
`@/components/ui/button`, `@/lib/prisma`. There is no `src/` directory.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Public landing page — enter a tracking number |
| `/track/[trackingNumber]` | Public tracking page, looked up by tracking number |
| `/t/[shareToken]` | Public tracking page, looked up by share link |
| `/api/track/[trackingNumber]` | Public JSON tracking endpoint (allow-listed fields only) |
| `/login` | Admin sign-in |
| `/admin` | Admin shipment list |
| `/admin/shipments/new` | Create a shipment |
| `/admin/shipments/[id]` | Shipment detail — edit header, add/delete events, regenerate share link, delete |
| `/admin/users` | Manage admin users |

## Data model

A shipment's `status` is derived from its latest event (`occurredAt`, then
`createdAt` as a tiebreaker) and cached on the `Shipment` row so list/detail
views don't need to recompute it on every read; the cache is refreshed
whenever events change. Tracking numbers are generated in the form
`ECH-YYYY-NNNNN` (year plus a zero-padded per-year sequence). Share tokens are
32 random bytes (base64url-encoded) and can be regenerated from the shipment
detail page, which invalidates the old link.

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

## A note on the Prisma version

`prisma` and `@prisma/client` are pinned to `7.10.0` rather than floating to
the latest major. The `prisma` package on npm moved to a `8.x` line that is
the new Prisma Platform CLI beta — a different workflow (platform-managed
projects) — not a newer release of the ORM CLI this project uses. Pinning
avoids accidentally picking that up in a fresh install.

## Current state

Present and working:

- Public tracking by tracking number (`/track/[trackingNumber]`) and by share
  link (`/t/[shareToken]`), backed by a public JSON endpoint
  (`/api/track/[trackingNumber]`) that only ever returns an allow-listed shape
- Admin: session-gated (JWT cookie) sign-in, shipment list/create/edit/delete,
  event add/delete, share-link regeneration, and admin user management
- Prisma schema, generated client, and seed script
- Root and admin-scoped error boundaries
- Unit and integration test suites (Vitest)

Not part of v1: document generation/storage, carrier integrations, and any
client-side data grid (Zustand/TanStack Table are not used).
