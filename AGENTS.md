# Export Cargo Hub

A deliberately small shipment-tracking app for an export freight forwarder (air and ocean).
Admins create shipments and log milestone events; anyone with a tracking number or an
unguessable share link can follow a shipment on a public page. That is the whole scope — no
documents, quotes, billing or customer accounts. Keep it that way unless asked.

## Stack, exactly as installed

- **Next.js 16** App Router, React 19, TypeScript `strict`. Request middleware is `src/proxy.ts`
  (the Next 16 name for middleware). `cookies()`, `headers()`, `params` and `searchParams` are
  async. Route components take the generated global types `PageProps<"/route">`,
  `LayoutProps<"/route">` and `RouteContext<"/route">`; run `npx next typegen` before `tsc`.
- **Tailwind CSS v4**, CSS-first: all tokens live in `src/app/globals.css` (`@theme inline` plus
  `:root`). There is no `tailwind.config`.
- **shadcn/ui, `base-lyra` style on Base UI.** Composition uses the `render` prop, not
  `asChild`. A `Button` that renders a `Link` needs `nativeButton={false}` or Base UI logs an
  error. Files under `src/components/ui/` come from the registry (`npx shadcn add -y <name>`);
  override their classes at the call site instead of editing them.
- Icons: `@phosphor-icons/react` (import from `/dist/ssr` in server components). Toasts: `sonner`.
- **Prisma ORM 7.10.0, pinned.** Do not float to 8.x, which is a different CLI. Generator
  `prisma-client` emits to `src/lib/generated/prisma` (gitignored, rebuilt by `npm run db:generate`
  and by `npm run build`). Driver adapter `@prisma/adapter-pg`; config in `prisma.config.ts`.
  Database is Postgres on Neon (~300 ms round trip from a laptop, so timeouts are generous).
- **Zod 4** for every mutation and every public/API ingress. **jose** HS256 JWT in an httpOnly
  `ech_session` cookie (7 days). **bcryptjs** cost 12. **Vitest** for tests.
- Deliberately **not** used: Zustand, TanStack Table/Query, tRPC, NextAuth, form libraries,
  CSS-in-JS. The app is server-first; reach for a client component only for interactivity.

## Layout

```
src/app/              routes — (public)/, (admin)/admin/, login/, api/track/[trackingNumber]/, robots.ts
src/actions/          Server Actions, one file per domain (auth, shipments, events, users)
src/lib/              everything that is not UI: prisma.ts, session.ts, dal.ts, format.ts,
                      auth/, shipments/, tracking/, validation/, users/, generated/ (gitignored)
src/components/ui/    shadcn primitives (registry-owned)
src/components/admin/ admin forms, tables, drawers, sidebar
src/components/tracking/ pieces shared by public and admin views (status badge, route strip, timeline)
src/components/brand/  logo mark and wordmark
src/components/        theme-provider.tsx and theme-toggle.tsx sit at the root of components/
src/proxy.ts          redirects unauthenticated /admin/* to /login?next=…
prisma/               schema.prisma, seed.ts
tests/unit/           pure-function tests, always run
tests/integration/    service tests against a real database, run only with TEST_DATABASE_URL
docs/superpowers/     design specs and implementation plans
```

Imports use the `@/*` alias, which maps to `src/*`. Prefer small files with one responsibility;
split a file rather than let it grow.

## Rules that the existing code follows

1. **Server Components by default.** Add `"use client"` only for hooks, event handlers or
   browser APIs, and keep those components thin (a drawer, a form, a nav link).
2. **One Prisma client.** Every query goes through the singleton in `src/lib/prisma.ts` and lives
   in a service under `src/lib/**`. Components and actions never query the database directly.
3. **Server Actions are thin and never throw for expected failures.** Each action in
   `src/actions/*` does exactly: `await requireAdmin()` → `parseForm(schema, formData)` → call the
   service → `revalidateShipment(...)` → return an `ActionResult`
   (`{ ok: true, ... } | { ok: false, message?, fieldErrors? }`) or `redirect(...)`. Services
   return graceful results for not-found, duplicates and foreign-key errors; actions surface
   them as messages. Forms consume actions with `useActionState` and show errors inline.
4. **Route Handlers only for the public tracking JSON endpoint** (and future file downloads).
   Everything else is a Server Component or a Server Action.
5. **Validation lives in `src/lib/validation/*`.** Reuse `optionalText`, `optionalDate` and
   `optionalNumber` (all bounded). `datetime-local` inputs are treated as UTC (a `Z` is appended).
   Redirect targets go through `safeNext` (same-origin paths only).
6. **Domain invariants.** A shipment's `status` is derived from its latest event
   (`deriveStatus` in `src/lib/tracking/status.ts`) and cached on the row; never set it by hand.
   Event types are a fixed enum including `EXCEPTION`, which requires a note. Tracking numbers are
   `ECH-YYYY-NNNNN` from the `TrackingSequence` table (per-year upsert with a P2002 retry).
   Share tokens are random and can be regenerated. Adding or deleting events takes a
   `FOR UPDATE` lock on the shipment inside a transaction.
7. **Public output is an allow-list.** Anything leaving the server for the public pages or the
   JSON route passes through `toPublicShipment`; `id`, `shareToken`, internal notes and
   timestamps never leave. Public tracking pages are `noindex`.
8. **Auth.** Email plus password stored in the database. `verifyCredentials` compares against a
   dummy hash when the user does not exist so timing does not leak. Every admin page and action
   calls `requireAdmin()` from `src/lib/dal.ts`; the proxy is only the first line of defence.
9. **Dates render through `src/lib/format.ts`** (fixed month table, UTC). Do not use
   `toLocaleDateString`; ICU output differs between machines and broke a test once.
10. **UI conventions.** Tokens: navy `#0B1B3A` (primary), amber `#F59E0B` (accent and focus ring),
    page background `#F5F6F8`, ink `#111827`, border `#E2E5EA`, radius 6px. Geist Sans for all
    text; JetBrains Mono only for reference values (tracking numbers, AWB/BL). Content sits in
    cards: `rounded-md border border-border bg-card`. Form controls use `Field` and
    `controlClass` from `src/components/admin/form-field.tsx`. Side panels are the shadcn `Sheet`
    drawer. Status is always shown with `StatusBadge`; routes with `RouteStrip`. The brand mark
    and wordmark come from `src/components/brand/logo.tsx` — pass `tone="inverse"` on a navy
    surface. The favicon is `src/app/icon.svg` and must stay in step with that mark.
11. **Copy.** Sentence case everywhere, no all-caps labels, no middle dots, no `→` in text (use
    an icon). A button names the action and its toast mirrors it ("Save changes" → "Changes
    saved"). Errors say what happened and what to do, without apologising.
12. **Both themes are supported.** `next-themes` writes `class="dark"` on `<html>`; the palette
    lives in the `.dark` block of `globals.css` and is navy-based, with amber taking over as
    `--primary` because navy would vanish on a navy page. Never hardcode a hex in a component:
    add a token to both blocks instead. `color-scheme` is set per theme so native selects and
    date inputs follow. The exception is text on an always-amber or always-navy surface, which
    is correct in both themes. New surfaces must be checked in light and dark before merging.
13. **Tests.** Unit tests for pure logic, integration tests for services against a real
    database. Integration suites `TRUNCATE` tables, so `TEST_DATABASE_URL` must never point at the
    main database. Test and hook timeouts are 60 s because the database is remote.
14. **Secrets.** `.env` is gitignored. Never print, log or commit its contents, session tokens or
    passwords. `.env.example` documents the variables.
15. **Git.** Work on a feature branch off `main` and open a PR to `main`. Commit subjects use
    conventional prefixes (`feat:`, `fix:`, `style:`, `docs:`, `chore:`, `test:`) and every commit
    should pass lint, types and tests. Ask before creating repositories or pushing to a new
    remote. Commit `AGENTS.md` changes made by `next dev` along with your work.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npx next typegen && npx tsc --noEmit` | Route types plus a full type check |
| `npm test` | Vitest (integration suites only with `TEST_DATABASE_URL`) |
| `npm run build` | `prisma generate` then `next build` |
| `npm run db:push` | Push `prisma/schema.prisma` to the database |
| `npm run db:generate` | Regenerate the Prisma client into `src/lib/generated/prisma` |
| `npm run db:seed` | Upsert the first admin from `ADMIN_*` in `.env` |
| `npx prisma studio` | Browse the database |

Before pushing, run all of: `npm run lint && npx next typegen && npx tsc --noEmit && npm test && npm run build`.

## Environment

`DATABASE_URL` (Neon, direct host, `sslmode=verify-full`), `TEST_DATABASE_URL` (a separate
disposable database), `SESSION_SECRET` (32+ characters), and `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_NAME` for the seed. Admin users are otherwise managed on `/admin/users`.

## Gotchas already hit

- npm 11 blocks install scripts by default; `package.json` has an `allowScripts` block for the
  packages that need them.
- Vitest config is `vitest.config.mts` (ESM) and aliases `server-only` to a no-op mock so `lib`
  modules can be imported in tests.
- The dev server picks up the `src/` layout only at start-up; restart it after moving folders.
- For visual checks without a browser at hand, Google Chrome on this machine runs headless and
  can be driven over the DevTools protocol to take screenshots.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
