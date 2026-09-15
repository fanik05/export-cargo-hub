# Shipment Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins create shipments and log milestone events; anyone with a tracking number or share link sees a public tracking page.

**Architecture:** Next.js 16 App Router, Server Components by default. Three Prisma models (`User`, `Shipment`, `ShipmentEvent`) plus a per-year sequence table. Stateless `jose` JWT session cookie with a `proxy.ts` optimistic redirect and a `requireAdmin()` data-access gate. Server Actions are thin glue: they call `requireAdmin()`, parse with Zod, and delegate to plain service functions in `lib/` that integration tests exercise directly.

**Tech Stack:** Next 16.3, React 19, TypeScript, Tailwind v4, shadcn (`base-lyra`), Prisma ORM 7.10 + `@prisma/adapter-pg`, Zod 4, jose, bcryptjs, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-shipment-tracking-design.md`

## Global Constraints

- Follow `AGENTS.md`: Server Components by default; all DB access through `@/lib/prisma`; mutations are Server Actions in `actions/` validated with Zod; Route Handlers only for the public JSON endpoint; `@/*` imports only; check `components/ui/` before writing custom primitives; no Pages Router; no DB access from client components; Tailwind only.
- **Prisma CLI version:** the scaffold installed `prisma@8.0.0-rc.15`, which is the new platform CLI beta whose ORM commands (`contract`, `db update`, `db sign`) differ from the `db push` workflow `AGENTS.md` prescribes and whose client is still 7.10.0. Task 1 pins `prisma@7.10.0` to match `@prisma/client@7.10.0`. Do not upgrade either package in this plan.
- Node 24 is installed (`node --version` → v24.x). Prisma 7 `prisma-client` generator output goes to `lib/generated/prisma` and is gitignored.
- Session cookie name is exactly `ech_session`; tracking numbers are exactly `ECH-<4-digit year>-<5-digit zero-padded>`.
- Public JSON and pages never expose `id`, `shareToken`, `notes`, `createdAt`, `updatedAt`.
- Login failure message is exactly `Invalid email or password`.
- Passwords: bcryptjs cost 12, minimum 8 characters.
- Tests: `npm test` runs Vitest. DB-backed tests run only when `TEST_DATABASE_URL` is set and skip otherwise.
- Before writing any Next.js code, the relevant guide under `node_modules/next/dist/docs/01-app/` is the source of truth (middleware is `proxy.ts`; `cookies()` and `params` are async; typed helpers `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>` are global after `next typegen`/`next dev`).
- Commit after every task with a conventional-commit message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Spec refinements made while planning

1. `Shipment` gains a cached `status EventType` column. It is still *derived* from the latest event (spec §3): every event insert/delete recomputes it inside the same transaction via `deriveStatus()`. This makes the `/admin` status filter a plain `where` clause instead of an in-memory filter that would break pagination.
2. `TrackingSequence.next` from the spec is named `last` (the last issued number) so a single Prisma `upsert` with `increment` yields the new number without raw SQL.
3. Server Actions delegate to service functions in `lib/shipments/`, `lib/users/`, `lib/auth/` so integration tests can run them without a request context (`cookies()` throws outside a request).

## File structure

```
prisma/schema.prisma            data model
prisma/seed.ts                  upsert first admin from env
prisma.config.ts                Prisma 7 config (datasource url, seed)
proxy.ts                        optimistic /admin redirect
vitest.config.ts, tests/setup.ts, tests/mocks/server-only.ts, tests/helpers/db.ts
lib/prisma.ts                   singleton with pg adapter
lib/session.ts                  jose JWT cookie helpers (+ pure encode/decode)
lib/dal.ts                      getCurrentUser(), requireAdmin()
lib/auth/credentials.ts         hashPassword(), verifyCredentials()
lib/validation/form.ts          ActionResult, parseForm()
lib/validation/{shipment,event,user,auth}.ts   Zod schemas
lib/tracking/status.ts          EVENT_TYPES, labels, tones, deriveStatus(), tracking # helpers
lib/tracking/token.ts           generateShareToken()
lib/tracking/public.ts          PublicShipment, toPublicShipment()
lib/tracking/queries.ts         findPublicShipmentByTrackingNumber/Token
lib/shipments/service.ts        create/update/delete/regenerate/list/get
lib/shipments/events.ts         addEvent, deleteEvent, recomputeStatus
lib/users/service.ts            listUsers, createUser, deleteUser
actions/{auth,shipments,events,users}.ts
app/(public)/layout.tsx, page.tsx, track/[trackingNumber]/page.tsx, t/[shareToken]/page.tsx
app/login/page.tsx
app/(admin)/admin/layout.tsx, page.tsx, error.tsx, not-found.tsx
app/(admin)/admin/shipments/new/page.tsx, [id]/page.tsx
app/(admin)/admin/users/page.tsx
app/api/track/[trackingNumber]/route.ts
app/error.tsx
components/tracking/{tracking-view,status-badge,event-timeline}.tsx
components/admin/{shipment-form,event-form,user-form,shipment-table,delete-shipment-button,copy-button,logout-button,search-form}.tsx
components/ui/*                 shadcn primitives
```

---

### Task 1: Prisma 7 toolchain, schema, client singleton, seed

**Files:**
- Modify: `package.json` (devDependency `prisma`, scripts)
- Modify: `.gitignore`
- Create: `prisma.config.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `lib/prisma.ts`, `lib/auth/credentials.ts`, `.env.example`

**Interfaces:**
- Produces: `prisma` singleton from `@/lib/prisma`; generated types from `@/lib/generated/prisma/client` (`PrismaClient`, `EventType`, `ShipmentMode`, `Prisma`); `hashPassword(plain: string): Promise<string>` and `verifyCredentials(email: string, password: string): Promise<{ id: string; name: string; email: string } | null>` from `@/lib/auth/credentials`.

- [ ] **Step 1: Pin Prisma CLI to 7.10.0 and install runtime deps**

```bash
npm install --save-dev prisma@7.10.0
npm install zod jose bcryptjs server-only
npx prisma --version
```
Expected: the version line shows `prisma : 7.10.0` (not the JSON envelope printed by the 8 rc CLI).

- [ ] **Step 2: Write `prisma.config.ts`**

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

- [ ] **Step 3: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum ShipmentMode {
  AIR
  OCEAN
}

enum EventType {
  BOOKED
  CARGO_RECEIVED
  DEPARTED_ORIGIN
  IN_TRANSIT
  ARRIVED_DESTINATION
  CUSTOMS_CLEARED
  OUT_FOR_DELIVERY
  DELIVERED
  EXCEPTION
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
}

model Shipment {
  id              String          @id @default(cuid())
  trackingNumber  String          @unique
  shareToken      String          @unique
  mode            ShipmentMode
  status          EventType       @default(BOOKED)
  shipperName     String
  consigneeName   String
  originPort      String
  destinationPort String
  carrier         String?
  masterRef       String?
  etd             DateTime?
  eta             DateTime?
  pieces          Int?
  weightKg        Decimal?        @db.Decimal(10, 2)
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  events          ShipmentEvent[]

  @@index([status])
  @@index([createdAt])
}

model ShipmentEvent {
  id         String    @id @default(cuid())
  shipmentId String
  shipment   Shipment  @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  type       EventType
  occurredAt DateTime
  location   String?
  note       String?
  createdAt  DateTime  @default(now())

  @@index([shipmentId, occurredAt])
}

model TrackingSequence {
  year Int @id
  last Int @default(0)
}
```

- [ ] **Step 4: Gitignore generated client, un-ignore `.env.example`, add scripts**

Append to `.gitignore`:
```
# prisma generated client
/lib/generated/
!.env.example
```
Note: `!.env.example` must come *after* the existing `.env*` line (appending satisfies this).

In `package.json` `scripts`, add:
```json
"test": "vitest run",
"db:push": "prisma db push",
"db:generate": "prisma generate",
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 5: Write `.env.example`**

```
# PostgreSQL connection string (hosted Postgres, e.g. Neon/Supabase/Railway)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/export_cargo_hub?sslmode=require"

# Optional: a second database used only by `npm test` integration tests. Tables are truncated.
# TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/export_cargo_hub_test?sslmode=require"

# 32+ random bytes, e.g. `openssl rand -base64 48`
SESSION_SECRET="change-me"

# First admin, created by `npm run db:seed`
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me-please"
ADMIN_NAME="Admin"
```

Then create a real `.env` (gitignored) from it with the user's hosted `DATABASE_URL`. If no `DATABASE_URL` is available, stop and ask the user for one; everything after Step 7 needs a database.

- [ ] **Step 6: Write `lib/prisma.ts`**

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 7: Generate the client and push the schema**

```bash
npx prisma validate
npx prisma generate
npx prisma db push
ls lib/generated/prisma/client.ts
```
Expected: `validate` prints "The schema is valid", `generate` writes to `lib/generated/prisma`, `db push` reports the database is in sync, and `client.ts` exists.

- [ ] **Step 8: Write `lib/auth/credentials.ts`**

```ts
import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export type PublicUser = { id: string; name: string; email: string };

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, name: user.name, email: user.email };
}
```

- [ ] **Step 9: Write `prisma/seed.ts`**

`server-only` throws when imported outside React Server Components, so the seed hashes directly with bcryptjs instead of importing `lib/auth/credentials`.

```ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { name, passwordHash },
  });
  console.log(`Seeded admin ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 10: Seed and verify**

```bash
npm run db:seed
npx tsx -e 'import "dotenv/config"; import { prisma } from "./lib/prisma"; prisma.user.count().then(n => { console.log("users:", n); return prisma.$disconnect(); })'
```
Expected: `Seeded admin <email>` then `users: 1`. (`lib/prisma.ts` imports the generated client via the `@/` alias; tsx resolves `tsconfig` `paths`, so this works. If it does not on your tsx version, run the check with `npx tsx --tsconfig tsconfig.json -e ...`.)

- [ ] **Step 11: Lint and commit**

```bash
npm run lint
git add package.json package-lock.json .gitignore .env.example prisma.config.ts prisma/schema.prisma prisma/seed.ts lib/prisma.ts lib/auth/credentials.ts
git commit -m "feat: add Prisma 7 schema, client singleton, and admin seed

Pins prisma CLI to 7.10.0 to match @prisma/client.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tracking domain helpers with Vitest

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/mocks/server-only.ts`
- Create: `lib/tracking/status.ts`, `lib/tracking/token.ts`
- Test: `tests/unit/tracking-status.test.ts`, `tests/unit/tracking-token.test.ts`

**Interfaces:**
- Consumes: `EventType` enum from `@/lib/generated/prisma/client`.
- Produces (from `@/lib/tracking/status`):
  - `EVENT_TYPES: readonly EventType[]` in timeline order.
  - `EVENT_LABELS: Record<EventType, string>`.
  - `STATUS_TONE: Record<EventType, "neutral" | "info" | "success" | "warning">`.
  - `deriveStatus(events: { type: EventType; occurredAt: Date; createdAt: Date }[]): EventType | null`.
  - `formatTrackingNumber(year: number, seq: number): string`.
  - `normalizeTrackingNumber(input: string): string`.
  - `TRACKING_NUMBER_RE: RegExp`.
- Produces (from `@/lib/tracking/token`): `generateShareToken(): string` (43-char base64url).

- [ ] **Step 1: Install Vitest and write config**

```bash
npm install --save-dev vitest
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
```
`fileParallelism: false` keeps DB-backed test files from truncating tables under each other.

`tests/mocks/server-only.ts`:
```ts
// Replaces the `server-only` package under Vitest, which has no RSC context.
export {};
```

`tests/setup.ts`:
```ts
import "dotenv/config";

// Integration tests use a dedicated database. Point the prisma singleton at it.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
}
```

- [ ] **Step 2: Write the failing status tests**

`tests/unit/tracking-status.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  EVENT_LABELS,
  EVENT_TYPES,
  STATUS_TONE,
  TRACKING_NUMBER_RE,
  deriveStatus,
  formatTrackingNumber,
  normalizeTrackingNumber,
} from "@/lib/tracking/status";

const d = (iso: string) => new Date(iso);

describe("deriveStatus", () => {
  it("returns null for no events", () => {
    expect(deriveStatus([])).toBeNull();
  });

  it("returns the type of the latest occurredAt regardless of array order", () => {
    const events = [
      { type: "DEPARTED_ORIGIN", occurredAt: d("2026-09-12T00:00:00Z"), createdAt: d("2026-09-12T00:00:00Z") },
      { type: "BOOKED", occurredAt: d("2026-09-10T00:00:00Z"), createdAt: d("2026-09-10T00:00:00Z") },
      { type: "CARGO_RECEIVED", occurredAt: d("2026-09-11T00:00:00Z"), createdAt: d("2026-09-11T00:00:00Z") },
    ] as const;
    expect(deriveStatus([...events])).toBe("DEPARTED_ORIGIN");
  });

  it("breaks occurredAt ties by createdAt", () => {
    const same = d("2026-09-12T00:00:00Z");
    const events = [
      { type: "IN_TRANSIT", occurredAt: same, createdAt: d("2026-09-12T01:00:00Z") },
      { type: "EXCEPTION", occurredAt: same, createdAt: d("2026-09-12T02:00:00Z") },
    ] as const;
    expect(deriveStatus([...events])).toBe("EXCEPTION");
  });
});

describe("tracking numbers", () => {
  it("formats ECH-YYYY-NNNNN with zero padding", () => {
    expect(formatTrackingNumber(2026, 42)).toBe("ECH-2026-00042");
    expect(formatTrackingNumber(2026, 123456)).toBe("ECH-2026-123456");
  });

  it("normalizes user input", () => {
    expect(normalizeTrackingNumber("  ech-2026-00042 ")).toBe("ECH-2026-00042");
  });

  it("matches only well-formed numbers", () => {
    expect(TRACKING_NUMBER_RE.test("ECH-2026-00042")).toBe(true);
    expect(TRACKING_NUMBER_RE.test("ECH-26-42")).toBe(false);
    expect(TRACKING_NUMBER_RE.test("hello")).toBe(false);
  });
});

describe("event metadata", () => {
  it("covers every event type with a label and a tone", () => {
    for (const type of EVENT_TYPES) {
      expect(EVENT_LABELS[type]).toBeTruthy();
      expect(STATUS_TONE[type]).toBeTruthy();
    }
    expect(EVENT_TYPES).toHaveLength(9);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- tests/unit/tracking-status.test.ts`
Expected: FAIL, cannot resolve `@/lib/tracking/status`.

- [ ] **Step 4: Write `lib/tracking/status.ts`**

```ts
import type { EventType } from "@/lib/generated/prisma/client";

export const EVENT_TYPES = [
  "BOOKED",
  "CARGO_RECEIVED",
  "DEPARTED_ORIGIN",
  "IN_TRANSIT",
  "ARRIVED_DESTINATION",
  "CUSTOMS_CLEARED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
] as const satisfies readonly EventType[];

export const EVENT_LABELS: Record<EventType, string> = {
  BOOKED: "Booked",
  CARGO_RECEIVED: "Cargo received",
  DEPARTED_ORIGIN: "Departed origin",
  IN_TRANSIT: "In transit",
  ARRIVED_DESTINATION: "Arrived at destination",
  CUSTOMS_CLEARED: "Customs cleared",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Exception",
};

export type StatusTone = "neutral" | "info" | "success" | "warning";

export const STATUS_TONE: Record<EventType, StatusTone> = {
  BOOKED: "neutral",
  CARGO_RECEIVED: "neutral",
  DEPARTED_ORIGIN: "info",
  IN_TRANSIT: "info",
  ARRIVED_DESTINATION: "info",
  CUSTOMS_CLEARED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  EXCEPTION: "warning",
};

type StatusEvent = { type: EventType; occurredAt: Date; createdAt: Date };

/** Status is the type of the latest event (occurredAt, then createdAt). */
export function deriveStatus(events: StatusEvent[]): EventType | null {
  let latest: StatusEvent | null = null;
  for (const e of events) {
    if (
      !latest ||
      e.occurredAt > latest.occurredAt ||
      (e.occurredAt.getTime() === latest.occurredAt.getTime() &&
        e.createdAt > latest.createdAt)
    ) {
      latest = e;
    }
  }
  return latest?.type ?? null;
}

export const TRACKING_NUMBER_RE = /^ECH-\d{4}-\d{5,}$/;

export function formatTrackingNumber(year: number, seq: number): string {
  return `ECH-${year}-${String(seq).padStart(5, "0")}`;
}

export function normalizeTrackingNumber(input: string): string {
  return input.trim().toUpperCase();
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- tests/unit/tracking-status.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the failing token test**

`tests/unit/tracking-token.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generateShareToken } from "@/lib/tracking/token";

describe("generateShareToken", () => {
  it("is base64url and unique", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npm test -- tests/unit/tracking-token.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 8: Write `lib/tracking/token.ts`**

```ts
import { randomBytes } from "node:crypto";

/** 32 random bytes as base64url (43 chars, no padding). */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}
```

- [ ] **Step 9: Run all tests, lint, commit**

```bash
npm test
npm run lint
git add vitest.config.ts tests lib/tracking package.json package-lock.json
git commit -m "feat: add tracking status helpers and Vitest setup

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Zod schemas and form parsing

**Files:**
- Create: `lib/validation/form.ts`, `lib/validation/shipment.ts`, `lib/validation/event.ts`, `lib/validation/user.ts`, `lib/validation/auth.ts`
- Test: `tests/unit/validation.test.ts`

**Interfaces:**
- Produces (from `@/lib/validation/form`):
  ```ts
  export type ActionResult =
    | { ok: true }
    | { ok: false; message?: string; fieldErrors?: Record<string, string[]> };
  export const INITIAL_ACTION_STATE: ActionResult;  // { ok: false }
  export function parseForm<S extends z.ZodType>(schema: S, formData: FormData):
    { ok: true; data: z.output<S> } | { ok: false; fieldErrors: Record<string, string[]> };
  ```
- Produces schemas and their `z.output` types: `shipmentSchema`/`ShipmentInput`, `eventSchema`/`EventInput`, `createUserSchema`/`CreateUserInput`, `loginSchema`/`LoginInput`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseForm } from "@/lib/validation/form";
import { shipmentSchema } from "@/lib/validation/shipment";
import { eventSchema } from "@/lib/validation/event";
import { createUserSchema } from "@/lib/validation/user";
import { loginSchema } from "@/lib/validation/auth";

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("shipmentSchema", () => {
  const valid = {
    mode: "AIR",
    shipperName: "Acme Textiles",
    consigneeName: "Berlin Imports GmbH",
    originPort: "DAC – Dhaka",
    destinationPort: "FRA – Frankfurt",
    carrier: "",
    masterRef: "",
    etd: "2026-09-20",
    eta: "",
    pieces: "12",
    weightKg: "340.5",
    notes: "",
  };

  it("accepts a valid form and coerces types", () => {
    const r = parseForm(shipmentSchema, fd(valid));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.mode).toBe("AIR");
    expect(r.data.carrier).toBeNull();
    expect(r.data.etd).toBeInstanceOf(Date);
    expect(r.data.eta).toBeNull();
    expect(r.data.pieces).toBe(12);
    expect(r.data.weightKg).toBe(340.5);
    expect(r.data.notes).toBeNull();
  });

  it("reports field errors for missing required fields and bad numbers", () => {
    const r = parseForm(shipmentSchema, fd({ ...valid, shipperName: "", pieces: "-1", mode: "TRUCK" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.shipperName?.[0]).toBeTruthy();
    expect(r.fieldErrors.pieces?.[0]).toBeTruthy();
    expect(r.fieldErrors.mode?.[0]).toBeTruthy();
  });
});

describe("eventSchema", () => {
  it("parses datetime-local input and optional fields", () => {
    const r = parseForm(eventSchema, fd({ type: "DEPARTED_ORIGIN", occurredAt: "2026-09-15T10:30", location: "DAC", note: "" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.type).toBe("DEPARTED_ORIGIN");
    expect(r.data.occurredAt).toBeInstanceOf(Date);
    expect(r.data.location).toBe("DAC");
    expect(r.data.note).toBeNull();
  });

  it("requires a note for EXCEPTION events", () => {
    const r = parseForm(eventSchema, fd({ type: "EXCEPTION", occurredAt: "2026-09-15T10:30", location: "", note: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.note?.[0]).toMatch(/note/i);
  });

  it("rejects an unparseable date", () => {
    const r = parseForm(eventSchema, fd({ type: "BOOKED", occurredAt: "not-a-date" }));
    expect(r.ok).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("lowercases email and enforces password length", () => {
    const ok = parseForm(createUserSchema, fd({ name: "Ops", email: "OPS@Example.com", password: "longenough" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.email).toBe("ops@example.com");
    const bad = parseForm(createUserSchema, fd({ name: "Ops", email: "nope", password: "short" }));
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.fieldErrors.email).toBeTruthy();
    expect(bad.fieldErrors.password).toBeTruthy();
  });
});

describe("loginSchema", () => {
  it("only allows same-origin next paths", () => {
    const a = parseForm(loginSchema, fd({ email: "a@b.co", password: "x", next: "/admin/users" }));
    expect(a.ok && a.data.next).toBe("/admin/users");
    const b = parseForm(loginSchema, fd({ email: "a@b.co", password: "x", next: "//evil.com" }));
    expect(b.ok && b.data.next).toBe("/admin");
    const c = parseForm(loginSchema, fd({ email: "a@b.co", password: "x", next: "https://evil.com" }));
    expect(c.ok && c.data.next).toBe("/admin");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/unit/validation.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `lib/validation/form.ts`**

```ts
import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> };

export const INITIAL_ACTION_STATE: ActionResult = { ok: false };

export function issuesToFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Converts FormData to a plain object (first value per key) and parses it. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; fieldErrors: Record<string, string[]> } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (!(key in raw)) raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: issuesToFieldErrors(result.error.issues) };
}

/** "" -> null, otherwise trimmed string. For optional text inputs. */
export const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s));

/** "" -> null, otherwise a Date. Accepts "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm". */
export const optionalDate = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === "") return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

export const requiredDate = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((s, ctx) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

/** "" -> null, otherwise a number. */
export function optionalNumber(opts: { int?: boolean; min?: number } = {}) {
  return z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (Number.isNaN(n) || (opts.int && !Number.isInteger(n)) || (opts.min !== undefined && n < opts.min)) {
        ctx.addIssue({ code: "custom", message: "Enter a valid number" });
        return z.NEVER;
      }
      return n;
    });
}
```

- [ ] **Step 4: Write the four schema files**

`lib/validation/shipment.ts`:
```ts
import { z } from "zod";
import { optionalDate, optionalNumber, optionalText } from "@/lib/validation/form";

export const shipmentSchema = z.object({
  mode: z.enum(["AIR", "OCEAN"], { message: "Choose air or ocean" }),
  shipperName: z.string().trim().min(1, "Required").max(200),
  consigneeName: z.string().trim().min(1, "Required").max(200),
  originPort: z.string().trim().min(1, "Required").max(200),
  destinationPort: z.string().trim().min(1, "Required").max(200),
  carrier: optionalText,
  masterRef: optionalText,
  etd: optionalDate,
  eta: optionalDate,
  pieces: optionalNumber({ int: true, min: 0 }),
  weightKg: optionalNumber({ min: 0 }),
  notes: optionalText,
});

export type ShipmentInput = z.output<typeof shipmentSchema>;
```

`lib/validation/event.ts`:
```ts
import { z } from "zod";
import { EVENT_TYPES } from "@/lib/tracking/status";
import { optionalText, requiredDate } from "@/lib/validation/form";

export const eventSchema = z
  .object({
    type: z.enum(EVENT_TYPES, { message: "Choose an event type" }),
    occurredAt: requiredDate,
    location: optionalText.optional().transform((v) => v ?? null),
    note: optionalText.optional().transform((v) => v ?? null),
  })
  .superRefine((data, ctx) => {
    if (data.type === "EXCEPTION" && !data.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "A note is required for exceptions" });
    }
  });

export type EventInput = z.output<typeof eventSchema>;
```

`lib/validation/user.ts`:
```ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "At least 8 characters").max(200),
});

export type CreateUserInput = z.output<typeof createUserSchema>;
```

`lib/validation/auth.ts`:
```ts
import { z } from "zod";

const safeNext = z
  .string()
  .optional()
  .transform((v) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/admin"));

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Required"),
  next: safeNext,
});

export type LoginInput = z.output<typeof loginSchema>;
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- tests/unit/validation.test.ts`
Expected: PASS. If `z.email` or `z.core.$ZodIssue` is not exported, check `node_modules/zod/package.json` version: this plan targets Zod 4. For Zod 3 replace `z.email(...)` with `z.string().email(...)` and type issues as `z.ZodIssue`.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add lib/validation tests/unit/validation.test.ts
git commit -m "feat: add Zod schemas and form parsing helper

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Session cookie, data-access gate, and proxy

**Files:**
- Create: `lib/session.ts`, `lib/dal.ts`, `proxy.ts`
- Test: `tests/unit/session.test.ts`

**Interfaces:**
- Produces (from `@/lib/session`):
  - `SESSION_COOKIE = "ech_session"`, `SESSION_TTL_SECONDS = 7 * 24 * 60 * 60`.
  - `encodeSession(userId: string, secret: string, ttlSeconds?: number): Promise<string>` (pure).
  - `decodeSession(token: string, secret: string): Promise<{ userId: string } | null>` (pure).
  - `createSession(userId: string): Promise<void>` sets the cookie; `getSession(): Promise<{ userId: string } | null>`; `destroySession(): Promise<void>`.
- Produces (from `@/lib/dal`): `getCurrentUser(): Promise<PublicUser | null>` and `requireAdmin(): Promise<PublicUser>` (redirects to `/login` when unauthenticated). Both wrapped in React `cache()`.

- [ ] **Step 1: Write the failing session tests**

`tests/unit/session.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";

const SECRET = "unit-test-secret-unit-test-secret-1234";

describe("session token", () => {
  it("round-trips the user id", async () => {
    const token = await encodeSession("user_123", SECRET);
    expect(await decodeSession(token, SECRET)).toEqual({ userId: "user_123" });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await encodeSession("user_123", "other-secret-other-secret-other-1234");
    expect(await decodeSession(token, SECRET)).toBeNull();
  });

  it("rejects garbage and expired tokens", async () => {
    expect(await decodeSession("not.a.jwt", SECRET)).toBeNull();
    const expired = await encodeSession("user_123", SECRET, -10);
    expect(await decodeSession(expired, SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/unit/session.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `lib/session.ts`**

```ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ech_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

function requireSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return s;
}

export async function encodeSession(
  userId: string,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secretKey(secret));
}

export async function decodeSession(
  token: string,
  secret: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = await encodeSession(userId, requireSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token, requireSecret());
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
```
(No `server-only` here because `proxy.ts` imports `decodeSession`; the pure functions are safe anywhere.)

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/unit/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `lib/dal.ts`**

```ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { PublicUser } from "@/lib/auth/credentials";

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
  return user;
});

/** The real auth gate. Call first in every admin page, layout, and Server Action. */
export const requireAdmin = cache(async (): Promise<PublicUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
```

- [ ] **Step 6: Write `proxy.ts` (repo root)**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = token && secret ? await decodeSession(token, secret) : null;

  if (pathname.startsWith("/admin") && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
```

- [ ] **Step 7: Type-check, lint, commit**

```bash
npx next typegen && npx tsc --noEmit
npm run lint
git add lib/session.ts lib/dal.ts proxy.ts tests/unit/session.test.ts
git commit -m "feat: add JWT session cookie, requireAdmin gate, and admin proxy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Login, logout, and the admin shell

**Files:**
- Create: `actions/auth.ts`, `app/login/page.tsx`, `components/admin/login-form.tsx`, `components/admin/logout-button.tsx`, `app/(admin)/admin/layout.tsx`, `app/(admin)/admin/page.tsx` (placeholder replaced in Task 9)
- Modify: `app/layout.tsx` (metadata title)
- Test: `tests/integration/credentials.test.ts`, `tests/helpers/db.ts`

**Interfaces:**
- Consumes: `verifyCredentials`, `createSession`, `destroySession`, `requireAdmin`, `loginSchema`, `parseForm`, `ActionResult`.
- Produces: `login(prev: ActionResult, formData: FormData): Promise<ActionResult>` and `logout(): Promise<void>` from `@/actions/auth`; `resetDb()` and `hasTestDb` from `tests/helpers/db.ts`.

- [ ] **Step 1: Write the DB test helper**

`tests/helpers/db.ts`:
```ts
import { prisma } from "@/lib/prisma";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/** Truncates every app table. Only ever runs against TEST_DATABASE_URL (see tests/setup.ts). */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ShipmentEvent", "Shipment", "TrackingSequence", "User" RESTART IDENTITY CASCADE',
  );
}
```
Also run `npx prisma db push` once against the test database so it has the schema:
```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push
```
(Read `TEST_DATABASE_URL` from `.env` first: `export $(grep TEST_DATABASE_URL .env)`. If the user has not provided a test database, skip this and note that integration tests will be skipped.)

- [ ] **Step 2: Write the failing credentials test**

`tests/integration/credentials.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyCredentials } from "@/lib/auth/credentials";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("verifyCredentials", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { email: "ops@example.com", name: "Ops", passwordHash: await hashPassword("correct-horse") },
    });
  });

  it("returns the public user for a correct password (email case-insensitive)", async () => {
    const u = await verifyCredentials("OPS@example.com", "correct-horse");
    expect(u).toMatchObject({ email: "ops@example.com", name: "Ops" });
    expect(u && "passwordHash" in u).toBe(false);
  });

  it("returns null for a wrong password or unknown email", async () => {
    expect(await verifyCredentials("ops@example.com", "wrong")).toBeNull();
    expect(await verifyCredentials("nobody@example.com", "correct-horse")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it**

Run: `npm test -- tests/integration/credentials.test.ts`
Expected: PASS if `TEST_DATABASE_URL` is set (the code exists from Task 1); otherwise reported as skipped. Either way, confirm no import errors.

- [ ] **Step 4: Write `actions/auth.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validation/auth";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return { ok: false, message: "Invalid email or password" };

  await createSession(user.id);
  redirect(parsed.data.next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
```

- [ ] **Step 5: Add the shadcn primitives needed from here on**

```bash
npx shadcn add -y input label select textarea table badge card dialog alert separator sonner
```
Expected: 11 new files under `components/ui/` plus `sonner` and `next-themes` deps. Then run `npx shadcn add --view dialog` and `npx shadcn add --view select` and note the exported names; later tasks assume `Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose` and use a native `<select>` styled with the Input classes rather than the Base UI Select (simpler for uncontrolled forms).

- [ ] **Step 6: Write the login form and page**

`components/admin/login-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!errors.password} />
        {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
      </div>
      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
```

`app/login/page.tsx`:
```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in · Export Cargo Hub" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm border border-border bg-card p-6">
        <h1 className="mb-1 text-lg font-semibold">Export Cargo Hub</h1>
        <p className="mb-6 text-sm text-muted-foreground">Admin sign in</p>
        <LoginForm next={nextPath} />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Write the admin layout, logout button, and placeholder page**

`components/admin/logout-button.tsx`:
```tsx
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm">Sign out</Button>
    </form>
  );
}
```

`app/(admin)/admin/layout.tsx`:
```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { LogoutButton } from "@/components/admin/logout-button";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold">Export Cargo Hub</Link>
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">Shipments</Link>
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">Users</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <Toaster />
    </div>
  );
}
```

`app/(admin)/admin/page.tsx` (temporary, replaced in Task 9):
```tsx
export default function AdminHome() {
  return <p className="text-sm text-muted-foreground">Shipments list coming in Task 9.</p>;
}
```

In `app/layout.tsx`, change `metadata` to:
```ts
export const metadata: Metadata = {
  title: "Export Cargo Hub",
  description: "Shipment tracking for air and ocean freight",
};
```

- [ ] **Step 8: Verify in the browser**

```bash
npm run dev
```
Then check, in order:
1. `curl -sI http://localhost:3000/admin | head -3` → `307` with `location: /login?next=%2Fadmin`.
2. Open `http://localhost:3000/login`, submit wrong password → "Invalid email or password".
3. Submit the seeded `ADMIN_EMAIL`/`ADMIN_PASSWORD` → lands on `/admin` showing the placeholder and your name.
4. Click "Sign out" → back at `/login`; visiting `/admin` redirects again.
Stop the dev server.

- [ ] **Step 9: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add actions/auth.ts app/login app/(admin) app/layout.tsx components/admin components/ui tests/helpers tests/integration package.json package-lock.json
git commit -m "feat: add login/logout and the admin shell

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Public shipment shape, lookups, and JSON route

**Files:**
- Create: `lib/tracking/public.ts`, `lib/tracking/queries.ts`, `app/api/track/[trackingNumber]/route.ts`
- Test: `tests/unit/public-shape.test.ts`, `tests/integration/tracking-lookup.test.ts`

**Interfaces:**
- Produces (from `@/lib/tracking/public`):
  ```ts
  export type PublicEvent = { type: EventType; occurredAt: string; location: string | null; note: string | null };
  export type PublicShipment = {
    trackingNumber: string; mode: ShipmentMode; status: EventType;
    shipperName: string; consigneeName: string; originPort: string; destinationPort: string;
    carrier: string | null; masterRef: string | null; etd: string | null; eta: string | null;
    pieces: number | null; weightKg: string | null; events: PublicEvent[];  // newest first
  };
  export function toPublicShipment(s: ShipmentWithEvents): PublicShipment;
  ```
- Produces (from `@/lib/tracking/queries`): `findPublicShipmentByTrackingNumber(n: string)` and `findPublicShipmentByToken(t: string)`, both `Promise<PublicShipment | null>`. Also `shipmentWithEventsArgs` (the Prisma `include`) for reuse.

- [ ] **Step 1: Write the failing unit test for the allow-list**

`tests/unit/public-shape.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toPublicShipment } from "@/lib/tracking/public";

describe("toPublicShipment", () => {
  it("exposes only public fields and orders events newest first", () => {
    const shipment = {
      id: "cs_internal",
      trackingNumber: "ECH-2026-00001",
      shareToken: "secret-token",
      mode: "OCEAN",
      status: "DEPARTED_ORIGIN",
      shipperName: "A",
      consigneeName: "B",
      originPort: "CGP",
      destinationPort: "HAM",
      carrier: null,
      masterRef: "MAEU123",
      etd: new Date("2026-09-10T00:00:00Z"),
      eta: null,
      pieces: 3,
      weightKg: { toString: () => "120.50" },
      notes: "internal remark",
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [
        { id: "e1", shipmentId: "cs_internal", type: "BOOKED", occurredAt: new Date("2026-09-01T00:00:00Z"), location: null, note: null, createdAt: new Date() },
        { id: "e2", shipmentId: "cs_internal", type: "DEPARTED_ORIGIN", occurredAt: new Date("2026-09-10T00:00:00Z"), location: "CGP", note: "On MV Example", createdAt: new Date() },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pub = toPublicShipment(shipment as any);
    expect(Object.keys(pub).sort()).toEqual(
      ["carrier", "consigneeName", "destinationPort", "eta", "etd", "events", "masterRef", "mode", "originPort", "pieces", "shipperName", "status", "trackingNumber", "weightKg"].sort(),
    );
    expect(pub.weightKg).toBe("120.50");
    expect(pub.etd).toBe("2026-09-10T00:00:00.000Z");
    expect(pub.events.map((e) => e.type)).toEqual(["DEPARTED_ORIGIN", "BOOKED"]);
    expect(Object.keys(pub.events[0]).sort()).toEqual(["location", "note", "occurredAt", "type"]);
    expect(JSON.stringify(pub)).not.toContain("secret-token");
    expect(JSON.stringify(pub)).not.toContain("internal remark");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/unit/public-shape.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `lib/tracking/public.ts`**

```ts
import type { EventType, Prisma, ShipmentMode } from "@/lib/generated/prisma/client";

export const shipmentWithEventsArgs = {
  include: { events: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }] } },
} satisfies Prisma.ShipmentDefaultArgs;

export type ShipmentWithEvents = Prisma.ShipmentGetPayload<typeof shipmentWithEventsArgs>;

export type PublicEvent = {
  type: EventType;
  occurredAt: string;
  location: string | null;
  note: string | null;
};

export type PublicShipment = {
  trackingNumber: string;
  mode: ShipmentMode;
  status: EventType;
  shipperName: string;
  consigneeName: string;
  originPort: string;
  destinationPort: string;
  carrier: string | null;
  masterRef: string | null;
  etd: string | null;
  eta: string | null;
  pieces: number | null;
  weightKg: string | null;
  events: PublicEvent[];
};

/** Explicit allow-list: nothing internal (id, shareToken, notes, timestamps) leaves the server. */
export function toPublicShipment(s: ShipmentWithEvents): PublicShipment {
  const events = [...s.events].sort(
    (a, b) =>
      b.occurredAt.getTime() - a.occurredAt.getTime() ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return {
    trackingNumber: s.trackingNumber,
    mode: s.mode,
    status: s.status,
    shipperName: s.shipperName,
    consigneeName: s.consigneeName,
    originPort: s.originPort,
    destinationPort: s.destinationPort,
    carrier: s.carrier,
    masterRef: s.masterRef,
    etd: s.etd ? s.etd.toISOString() : null,
    eta: s.eta ? s.eta.toISOString() : null,
    pieces: s.pieces,
    weightKg: s.weightKg === null ? null : s.weightKg.toString(),
    events: events.map((e) => ({
      type: e.type,
      occurredAt: e.occurredAt.toISOString(),
      location: e.location,
      note: e.note,
    })),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/unit/public-shape.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing lookup integration test**

`tests/integration/tracking-lookup.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findPublicShipmentByToken, findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("public tracking lookups", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.shipment.create({
      data: {
        trackingNumber: "ECH-2026-00001",
        shareToken: "tok_abc",
        mode: "AIR",
        status: "BOOKED",
        shipperName: "A",
        consigneeName: "B",
        originPort: "DAC",
        destinationPort: "FRA",
        notes: "internal",
        events: { create: { type: "BOOKED", occurredAt: new Date("2026-09-01T00:00:00Z") } },
      },
    });
  });

  it("finds by tracking number, case- and whitespace-insensitive", async () => {
    const s = await findPublicShipmentByTrackingNumber(" ech-2026-00001 ");
    expect(s?.trackingNumber).toBe("ECH-2026-00001");
    expect(s?.events).toHaveLength(1);
    expect(JSON.stringify(s)).not.toContain("internal");
  });

  it("finds by share token", async () => {
    expect((await findPublicShipmentByToken("tok_abc"))?.trackingNumber).toBe("ECH-2026-00001");
  });

  it("returns null for unknown values", async () => {
    expect(await findPublicShipmentByTrackingNumber("ECH-2026-99999")).toBeNull();
    expect(await findPublicShipmentByToken("nope")).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- tests/integration/tracking-lookup.test.ts`
Expected: FAIL (module not found) when `TEST_DATABASE_URL` is set; skipped otherwise.

- [ ] **Step 7: Write `lib/tracking/queries.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { shipmentWithEventsArgs, toPublicShipment, type PublicShipment } from "@/lib/tracking/public";

export async function findPublicShipmentByTrackingNumber(input: string): Promise<PublicShipment | null> {
  const trackingNumber = normalizeTrackingNumber(input);
  if (!trackingNumber) return null;
  const s = await prisma.shipment.findUnique({ where: { trackingNumber }, ...shipmentWithEventsArgs });
  return s ? toPublicShipment(s) : null;
}

export async function findPublicShipmentByToken(token: string): Promise<PublicShipment | null> {
  if (!token) return null;
  const s = await prisma.shipment.findUnique({ where: { shareToken: token }, ...shipmentWithEventsArgs });
  return s ? toPublicShipment(s) : null;
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- tests/integration/tracking-lookup.test.ts`
Expected: PASS (or skipped without a test DB).

- [ ] **Step 9: Write the JSON route**

`app/api/track/[trackingNumber]/route.ts`:
```ts
import type { NextRequest } from "next/server";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/track/[trackingNumber]">) {
  const { trackingNumber } = await ctx.params;
  const shipment = await findPublicShipmentByTrackingNumber(trackingNumber);
  if (!shipment) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(shipment, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 10: Verify the route against the dev database**

```bash
npm run dev
curl -s http://localhost:3000/api/track/ECH-2026-99999 -w '\n%{http_code}\n'
```
Expected: `{"error":"not_found"}` and `404`. (No shipments exist yet; the 200 path is exercised in Task 7.) Stop the dev server.

- [ ] **Step 11: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add lib/tracking app/api tests
git commit -m "feat: add public shipment shape, lookups, and JSON tracking route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Shipment service and Server Actions

**Files:**
- Create: `lib/shipments/service.ts`, `actions/shipments.ts`
- Test: `tests/integration/shipments-service.test.ts`

**Interfaces:**
- Consumes: `ShipmentInput`, `formatTrackingNumber`, `generateShareToken`, `prisma`, `EVENT_TYPES`.
- Produces (from `@/lib/shipments/service`):
  ```ts
  export async function createShipment(input: ShipmentInput): Promise<{ id: string; trackingNumber: string }>;
  export async function updateShipment(id: string, input: ShipmentInput): Promise<void>;
  export async function deleteShipment(id: string): Promise<void>;
  export async function regenerateShareToken(id: string): Promise<string>;
  export type ShipmentListFilters = { q?: string; status?: EventType; page?: number };
  export const PAGE_SIZE = 50;
  export async function listShipments(f: ShipmentListFilters): Promise<{ rows: ShipmentRow[]; hasMore: boolean }>;
  export async function getShipmentById(id: string): Promise<ShipmentWithEvents | null>;
  ```
  where `ShipmentRow` = `Pick<Shipment, "id"|"trackingNumber"|"mode"|"status"|"shipperName"|"consigneeName"|"originPort"|"destinationPort"|"eta"|"updatedAt">`.
- Produces (from `@/actions/shipments`): `createShipmentAction(prev, formData)`, `updateShipmentAction(id, prev, formData)`, `deleteShipmentAction(id)`, `regenerateShareTokenAction(id, prev, formData)`.

- [ ] **Step 1: Write the failing service tests**

`tests/integration/shipments-service.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createShipment,
  deleteShipment,
  getShipmentById,
  listShipments,
  regenerateShareToken,
  updateShipment,
} from "@/lib/shipments/service";
import type { ShipmentInput } from "@/lib/validation/shipment";
import { hasTestDb, resetDb } from "../helpers/db";

const base: ShipmentInput = {
  mode: "AIR",
  shipperName: "Acme",
  consigneeName: "Berlin Imports",
  originPort: "DAC",
  destinationPort: "FRA",
  carrier: null,
  masterRef: null,
  etd: null,
  eta: null,
  pieces: null,
  weightKg: null,
  notes: null,
};

describe.skipIf(!hasTestDb)("shipment service", () => {
  beforeEach(resetDb);

  it("creates sequential tracking numbers and a BOOKED event", async () => {
    const year = new Date().getFullYear();
    const a = await createShipment(base);
    const b = await createShipment(base);
    expect(a.trackingNumber).toBe(`ECH-${year}-00001`);
    expect(b.trackingNumber).toBe(`ECH-${year}-00002`);
    const full = await getShipmentById(a.id);
    expect(full?.status).toBe("BOOKED");
    expect(full?.events.map((e) => e.type)).toEqual(["BOOKED"]);
    expect(full?.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("survives concurrent creates without duplicate numbers", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => createShipment(base)));
    const numbers = new Set(results.map((r) => r.trackingNumber));
    expect(numbers.size).toBe(5);
  });

  it("updates header fields", async () => {
    const { id } = await createShipment(base);
    await updateShipment(id, { ...base, carrier: "Emirates SkyCargo", pieces: 4, weightKg: 88.25 });
    const s = await getShipmentById(id);
    expect(s?.carrier).toBe("Emirates SkyCargo");
    expect(s?.pieces).toBe(4);
    expect(s?.weightKg?.toString()).toBe("88.25");
  });

  it("regenerates the share token", async () => {
    const { id } = await createShipment(base);
    const before = (await getShipmentById(id))!.shareToken;
    const after = await regenerateShareToken(id);
    expect(after).not.toBe(before);
    expect((await getShipmentById(id))!.shareToken).toBe(after);
  });

  it("deletes a shipment and cascades events", async () => {
    const { id } = await createShipment(base);
    await deleteShipment(id);
    expect(await getShipmentById(id)).toBeNull();
    expect(await prisma.shipmentEvent.count()).toBe(0);
  });

  it("lists with search, status filter, and paging", async () => {
    for (let i = 0; i < 3; i++) await createShipment({ ...base, shipperName: `Shipper ${i}` });
    const { id } = await createShipment({ ...base, shipperName: "Zeta", masterRef: "MAWB-777" });
    await prisma.shipment.update({ where: { id }, data: { status: "DELIVERED" } });

    expect((await listShipments({})).rows).toHaveLength(4);
    expect((await listShipments({ q: "mawb-777" })).rows.map((r) => r.shipperName)).toEqual(["Zeta"]);
    expect((await listShipments({ q: "Shipper 1" })).rows).toHaveLength(1);
    expect((await listShipments({ status: "DELIVERED" })).rows.map((r) => r.shipperName)).toEqual(["Zeta"]);
    expect((await listShipments({ page: 2 })).rows).toHaveLength(0);
    expect((await listShipments({})).hasMore).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/integration/shipments-service.test.ts`
Expected: FAIL, module not found (or skipped without a test DB; in that case still proceed and rely on the manual checks in Step 6).

- [ ] **Step 3: Write `lib/shipments/service.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { EventType, Prisma } from "@/lib/generated/prisma/client";
import { formatTrackingNumber } from "@/lib/tracking/status";
import { generateShareToken } from "@/lib/tracking/token";
import { shipmentWithEventsArgs, type ShipmentWithEvents } from "@/lib/tracking/public";
import type { ShipmentInput } from "@/lib/validation/shipment";

export const PAGE_SIZE = 50;

function headerData(input: ShipmentInput) {
  return {
    mode: input.mode,
    shipperName: input.shipperName,
    consigneeName: input.consigneeName,
    originPort: input.originPort,
    destinationPort: input.destinationPort,
    carrier: input.carrier,
    masterRef: input.masterRef,
    etd: input.etd,
    eta: input.eta,
    pieces: input.pieces,
    weightKg: input.weightKg,
    notes: input.notes,
  };
}

async function createOnce(input: ShipmentInput) {
  const year = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const seq = await tx.trackingSequence.upsert({
      where: { year },
      create: { year, last: 1 },
      update: { last: { increment: 1 } },
    });
    const trackingNumber = formatTrackingNumber(year, seq.last);
    const shipment = await tx.shipment.create({
      data: {
        ...headerData(input),
        trackingNumber,
        shareToken: generateShareToken(),
        status: "BOOKED",
        events: { create: { type: "BOOKED", occurredAt: new Date() } },
      },
      select: { id: true, trackingNumber: true },
    });
    return shipment;
  });
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
}

/** Creates the shipment, its first BOOKED event, and issues the next tracking number. Retries once on a unique-constraint race. */
export async function createShipment(input: ShipmentInput): Promise<{ id: string; trackingNumber: string }> {
  try {
    return await createOnce(input);
  } catch (err) {
    if (isUniqueViolation(err)) return createOnce(input);
    throw err;
  }
}

export async function updateShipment(id: string, input: ShipmentInput): Promise<void> {
  await prisma.shipment.update({ where: { id }, data: headerData(input) });
}

export async function deleteShipment(id: string): Promise<void> {
  await prisma.shipment.delete({ where: { id } });
}

export async function regenerateShareToken(id: string): Promise<string> {
  const shareToken = generateShareToken();
  await prisma.shipment.update({ where: { id }, data: { shareToken } });
  return shareToken;
}

export async function getShipmentById(id: string): Promise<ShipmentWithEvents | null> {
  return prisma.shipment.findUnique({ where: { id }, ...shipmentWithEventsArgs });
}

export type ShipmentListFilters = { q?: string; status?: EventType; page?: number };

const rowSelect = {
  id: true,
  trackingNumber: true,
  mode: true,
  status: true,
  shipperName: true,
  consigneeName: true,
  originPort: true,
  destinationPort: true,
  eta: true,
  updatedAt: true,
} satisfies Prisma.ShipmentSelect;

export type ShipmentRow = Prisma.ShipmentGetPayload<{ select: typeof rowSelect }>;

export async function listShipments(f: ShipmentListFilters): Promise<{ rows: ShipmentRow[]; hasMore: boolean }> {
  const page = Math.max(1, f.page ?? 1);
  const q = f.q?.trim();
  const where: Prisma.ShipmentWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(q
      ? {
          OR: [
            { trackingNumber: { contains: q, mode: "insensitive" } },
            { shipperName: { contains: q, mode: "insensitive" } },
            { consigneeName: { contains: q, mode: "insensitive" } },
            { masterRef: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.shipment.findMany({
    where,
    select: rowSelect,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/integration/shipments-service.test.ts`
Expected: PASS (6 tests). If the concurrent test fails with P2002 twice in a row, the retry covers only one collision; bump the retry loop to 3 attempts (`for (let attempt = 0; attempt < 3; attempt++)`).

- [ ] **Step 5: Write `actions/shipments.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import * as shipments from "@/lib/shipments/service";
import { shipmentSchema } from "@/lib/validation/shipment";
import { parseForm, type ActionResult } from "@/lib/validation/form";

function revalidateShipment(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/track/[trackingNumber]", "page");
  revalidatePath("/t/[shareToken]", "page");
}

export async function createShipmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(shipmentSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { id } = await shipments.createShipment(parsed.data);
  revalidatePath("/admin");
  redirect(`/admin/shipments/${id}`);
}

export async function updateShipmentAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(shipmentSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  await shipments.updateShipment(id, parsed.data);
  revalidateShipment(id);
  return { ok: true };
}

export async function deleteShipmentAction(id: string): Promise<void> {
  await requireAdmin();
  await shipments.deleteShipment(id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function regenerateShareTokenAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  await shipments.regenerateShareToken(id);
  revalidateShipment(id);
  return { ok: true };
}
```

- [ ] **Step 6: Smoke-test create through the service against the dev DB**

```bash
npx tsx -e 'import "dotenv/config"; import { prisma } from "./lib/prisma"; import { formatTrackingNumber } from "./lib/tracking/status"; import { generateShareToken } from "./lib/tracking/token";
(async () => {
  const year = new Date().getFullYear();
  const seq = await prisma.trackingSequence.upsert({ where: { year }, create: { year, last: 1 }, update: { last: { increment: 1 } } });
  const s = await prisma.shipment.create({ data: { trackingNumber: formatTrackingNumber(year, seq.last), shareToken: generateShareToken(), mode: "OCEAN", status: "BOOKED", shipperName: "Demo Shipper", consigneeName: "Demo Consignee", originPort: "CGP – Chattogram", destinationPort: "HAM – Hamburg", events: { create: { type: "BOOKED", occurredAt: new Date() } } } });
  console.log(s.trackingNumber); await prisma.$disconnect();
})()'
```
(This bypasses `server-only` in the service file, which tsx cannot import.) Then:
```bash
npm run dev
curl -s http://localhost:3000/api/track/<printed number> | head -c 400
```
Expected: JSON with `"status":"BOOKED"` and one event, and no `shareToken`/`notes` keys. Stop the dev server.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add lib/shipments actions/shipments.ts tests/integration/shipments-service.test.ts
git commit -m "feat: add shipment service and Server Actions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Event service and Server Actions

**Files:**
- Create: `lib/shipments/events.ts`, `actions/events.ts`
- Test: `tests/integration/events-service.test.ts`

**Interfaces:**
- Consumes: `EventInput`, `deriveStatus`, `prisma`, `createShipment` (for test setup).
- Produces (from `@/lib/shipments/events`):
  ```ts
  export async function addEvent(shipmentId: string, input: EventInput): Promise<{ id: string }>;
  export async function deleteEvent(eventId: string): Promise<{ ok: true } | { ok: false; message: string }>;
  ```
- Produces (from `@/actions/events`): `addEventAction(shipmentId, prev, formData)`, `deleteEventAction(shipmentId, eventId, prev, formData)`.

- [ ] **Step 1: Write the failing tests**

`tests/integration/events-service.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { addEvent, deleteEvent } from "@/lib/shipments/events";
import { createShipment, getShipmentById } from "@/lib/shipments/service";
import { hasTestDb, resetDb } from "../helpers/db";

const base = {
  mode: "AIR" as const, shipperName: "A", consigneeName: "B", originPort: "DAC", destinationPort: "FRA",
  carrier: null, masterRef: null, etd: null, eta: null, pieces: null, weightKg: null, notes: null,
};

describe.skipIf(!hasTestDb)("event service", () => {
  let shipmentId: string;
  beforeEach(async () => {
    await resetDb();
    shipmentId = (await createShipment(base)).id;
  });

  it("adding a later event updates the cached status", async () => {
    await addEvent(shipmentId, { type: "DEPARTED_ORIGIN", occurredAt: new Date(Date.now() + 60_000), location: "DAC", note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("DEPARTED_ORIGIN");
  });

  it("adding a back-dated event does not change the status", async () => {
    await addEvent(shipmentId, { type: "CARGO_RECEIVED", occurredAt: new Date("2020-01-01T00:00:00Z"), location: null, note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("BOOKED");
  });

  it("deleting the latest event rolls the status back", async () => {
    const { id } = await addEvent(shipmentId, { type: "DELIVERED", occurredAt: new Date(Date.now() + 60_000), location: null, note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("DELIVERED");
    expect(await deleteEvent(id)).toEqual({ ok: true });
    expect((await getShipmentById(shipmentId))?.status).toBe("BOOKED");
  });

  it("refuses to delete the only event", async () => {
    const only = (await prisma.shipmentEvent.findFirstOrThrow({ where: { shipmentId } })).id;
    const r = await deleteEvent(only);
    expect(r.ok).toBe(false);
    expect(await prisma.shipmentEvent.count({ where: { shipmentId } })).toBe(1);
  });

  it("returns a message for an unknown event id", async () => {
    expect((await deleteEvent("nope")).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/integration/events-service.test.ts`
Expected: FAIL, module not found (or skipped).

- [ ] **Step 3: Write `lib/shipments/events.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { deriveStatus } from "@/lib/tracking/status";
import type { EventInput } from "@/lib/validation/event";

type Tx = Prisma.TransactionClient;

/** Recomputes Shipment.status from its events. Must run inside the same transaction as the change. */
async function recomputeStatus(tx: Tx, shipmentId: string) {
  const events = await tx.shipmentEvent.findMany({
    where: { shipmentId },
    select: { type: true, occurredAt: true, createdAt: true },
  });
  const status = deriveStatus(events);
  if (status) {
    await tx.shipment.update({ where: { id: shipmentId }, data: { status } });
  }
}

export async function addEvent(shipmentId: string, input: EventInput): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.shipmentEvent.create({
      data: {
        shipmentId,
        type: input.type,
        occurredAt: input.occurredAt,
        location: input.location,
        note: input.note,
      },
      select: { id: true },
    });
    await recomputeStatus(tx, shipmentId);
    return event;
  });
}

export async function deleteEvent(eventId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.shipmentEvent.findUnique({ where: { id: eventId }, select: { shipmentId: true } });
    if (!event) return { ok: false as const, message: "Event not found" };
    const count = await tx.shipmentEvent.count({ where: { shipmentId: event.shipmentId } });
    if (count <= 1) return { ok: false as const, message: "A shipment must keep at least one event" };
    await tx.shipmentEvent.delete({ where: { id: eventId } });
    await recomputeStatus(tx, event.shipmentId);
    return { ok: true as const };
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/integration/events-service.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write `actions/events.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { addEvent, deleteEvent } from "@/lib/shipments/events";
import { eventSchema } from "@/lib/validation/event";
import { parseForm, type ActionResult } from "@/lib/validation/form";

function revalidateShipment(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/track/[trackingNumber]", "page");
  revalidatePath("/t/[shareToken]", "page");
}

export async function addEventAction(shipmentId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  await addEvent(shipmentId, parsed.data);
  revalidateShipment(shipmentId);
  return { ok: true };
}

export async function deleteEventAction(shipmentId: string, eventId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const result = await deleteEvent(eventId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidateShipment(shipmentId);
  return { ok: true };
}
```

- [ ] **Step 6: Lint, typecheck, run the full suite, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit && npm test
git add lib/shipments/events.ts actions/events.ts tests/integration/events-service.test.ts
git commit -m "feat: add shipment event service and Server Actions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Admin shipment list

**Files:**
- Create: `lib/format.ts`, `components/tracking/status-badge.tsx`, `components/admin/shipment-table.tsx`, `components/admin/search-form.tsx`
- Modify: `app/(admin)/admin/page.tsx` (replace placeholder)
- Test: `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: `listShipments`, `ShipmentRow`, `EVENT_TYPES`, `EVENT_LABELS`, `STATUS_TONE`.
- Produces: `StatusBadge({ status }: { status: EventType })`; `formatDate(d: Date | string | null): string` ("—" when null, e.g. `12 Sep 2026`) and `formatDateTime(d)` (e.g. `12 Sep 2026, 14:05 UTC`) from `@/lib/format`; `modeLabel(mode: ShipmentMode): string`.

- [ ] **Step 1: Write the failing format test**

`tests/unit/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, modeLabel } from "@/lib/format";

describe("format", () => {
  it("formats dates in UTC and handles null", () => {
    expect(formatDate(new Date("2026-09-12T23:30:00Z"))).toBe("12 Sep 2026");
    expect(formatDate("2026-09-12T23:30:00Z")).toBe("12 Sep 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(new Date("2026-09-12T14:05:00Z"))).toBe("12 Sep 2026, 14:05 UTC");
  });
  it("labels modes", () => {
    expect(modeLabel("AIR")).toBe("Air");
    expect(modeLabel("OCEAN")).toBe("Ocean");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/unit/format.test.ts` → FAIL, module not found.

- [ ] **Step 3: Write `lib/format.ts`**

```ts
import type { ShipmentMode } from "@/lib/generated/prisma/client";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

function toDate(d: Date | string | null): Date | null {
  if (d === null) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export function formatDate(d: Date | string | null): string {
  const date = toDate(d);
  return date ? dateFmt.format(date) : "—";
}

export function formatDateTime(d: Date | string | null): string {
  const date = toDate(d);
  return date ? `${dateFmt.format(date)}, ${timeFmt.format(date)} UTC` : "—";
}

export function modeLabel(mode: ShipmentMode): string {
  return mode === "AIR" ? "Air" : "Ocean";
}

/** For <input type="date"> defaultValue. */
export function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** For <input type="datetime-local"> defaultValue. */
export function toDateTimeInputValue(d: Date): string {
  return d.toISOString().slice(0, 16);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/unit/format.test.ts` → PASS.

- [ ] **Step 5: Write `components/tracking/status-badge.tsx`**

```tsx
import type { EventType } from "@/lib/generated/prisma/client";
import { EVENT_LABELS, STATUS_TONE, type StatusTone } from "@/lib/tracking/status";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

export function StatusBadge({ status, className }: { status: EventType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[STATUS_TONE[status]], className)}>
      {EVENT_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 6: Write the search form and table**

`components/admin/search-form.tsx` (server component; plain GET form, no JS):
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";

export function SearchForm({ q, status }: { q: string; status: string }) {
  return (
    <form method="get" action="/admin" className="flex flex-wrap items-end gap-2">
      <Input name="q" defaultValue={q} placeholder="Tracking #, shipper, consignee, AWB/BL" className="w-72" aria-label="Search" />
      <select name="status" defaultValue={status} aria-label="Status" className="h-8 border border-input bg-background px-2 text-xs">
        <option value="">Any status</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>{EVENT_LABELS[t]}</option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm">Filter</Button>
    </form>
  );
}
```

`components/admin/shipment-table.tsx`:
```tsx
import Link from "next/link";
import type { ShipmentRow } from "@/lib/shipments/service";
import { formatDate, modeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/tracking/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ShipmentTable({ rows }: { rows: ShipmentRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No shipments match.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracking #</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Shipper → Consignee</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <Link href={`/admin/shipments/${s.id}`} className="font-mono underline-offset-4 hover:underline">{s.trackingNumber}</Link>
            </TableCell>
            <TableCell>{modeLabel(s.mode)}</TableCell>
            <TableCell>{s.shipperName} → {s.consigneeName}</TableCell>
            <TableCell>{s.originPort} → {s.destinationPort}</TableCell>
            <TableCell>{formatDate(s.eta)}</TableCell>
            <TableCell><StatusBadge status={s.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
Confirm the Table export names with `npx shadcn add --view table`; adjust imports if they differ.

- [ ] **Step 7: Replace `app/(admin)/admin/page.tsx`**

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { listShipments } from "@/lib/shipments/service";
import { EVENT_TYPES } from "@/lib/tracking/status";
import type { EventType } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/admin/search-form";
import { ShipmentTable } from "@/components/admin/shipment-table";

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminShipmentsPage(props: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = first(sp.q);
  const statusRaw = first(sp.status);
  const status = (EVENT_TYPES as readonly string[]).includes(statusRaw) ? (statusRaw as EventType) : undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const { rows, hasMore } = await listShipments({ q, status, page });

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (status) nextParams.set("status", status);
  nextParams.set("page", String(page + 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Shipments</h1>
        <Button render={<Link href="/admin/shipments/new" />} size="sm">New shipment</Button>
      </div>
      <SearchForm q={q} status={status ?? ""} />
      <ShipmentTable rows={rows} />
      {hasMore && (
        <div className="flex justify-center">
          <Button render={<Link href={`/admin?${nextParams}`} />} variant="outline" size="sm">Load more</Button>
        </div>
      )}
    </div>
  );
}
```
The Base UI Button in this shadcn style takes a `render` prop for polymorphism; check `components/ui/button.tsx`. If it exposes `asChild` instead, use `<Button asChild><Link …/></Button>`.

- [ ] **Step 8: Verify in the browser**

`npm run dev`, sign in, open `/admin`. Expected: the demo shipment from Task 7 appears with a BOOKED badge; searching `demo` finds it; status filter `Delivered` shows "No shipments match."; "New shipment" links to `/admin/shipments/new` (404 until Task 10 is fine). Stop the dev server.

- [ ] **Step 9: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add lib/format.ts components/tracking components/admin app/(admin)/admin/page.tsx tests/unit/format.test.ts
git commit -m "feat: add admin shipment list with search and status filter

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Shipment create/edit forms and detail page

**Files:**
- Create: `components/admin/submit-button.tsx`, `components/admin/action-form.tsx`, `components/admin/field-error.tsx`, `components/admin/shipment-form.tsx`, `components/admin/event-form.tsx`, `components/admin/copy-button.tsx`, `components/admin/delete-shipment-button.tsx`, `components/admin/admin-event-list.tsx`
- Create: `app/(admin)/admin/shipments/new/page.tsx`, `app/(admin)/admin/shipments/[id]/page.tsx`, `app/(admin)/admin/not-found.tsx`

**Interfaces:**
- Consumes: `createShipmentAction`, `updateShipmentAction`, `deleteShipmentAction`, `regenerateShareTokenAction`, `addEventAction`, `deleteEventAction`, `getShipmentById`, `ShipmentWithEvents`, `EVENT_TYPES`, `EVENT_LABELS`, format helpers.
- Produces: reusable `SubmitButton`, `ActionForm`, `FieldError`, `CopyButton`.

- [ ] **Step 1: Write the small shared client pieces**

`components/admin/submit-button.tsx`:
```tsx
"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
```

`components/admin/action-form.tsx` (a form whose Server Action returns `ActionResult`; toasts the outcome):
```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
};

export function ActionForm({ action, successMessage, className, children }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  useEffect(() => {
    if (state.ok && successMessage) toast.success(successMessage);
    if (!state.ok && state.message) toast.error(state.message);
  }, [state, successMessage]);
  return <form action={formAction} className={className}>{children}</form>;
}
```

`components/admin/field-error.tsx`:
```tsx
export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}
```

`components/admin/copy-button.tsx`:
```tsx
"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
    >
      Copy {label.toLowerCase()}
    </Button>
  );
}
```

- [ ] **Step 2: Write `components/admin/shipment-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { toDateInputValue } from "@/lib/format";
import type { Shipment } from "@/lib/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/admin/field-error";
import { SubmitButton } from "@/components/admin/submit-button";

/** A Shipment with Decimal weightKg already stringified, so it can cross to the client. */
export type FormShipment = Omit<Shipment, "weightKg"> & { weightKg: string | null };

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  shipment?: FormShipment;
  submitLabel: string;
};

function Field({ id, label, errors, children }: { id: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError errors={errors} />
    </div>
  );
}

export function ShipmentForm({ action, shipment, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) toast.success("Shipment saved");
  }, [state]);

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <Field id="mode" label="Mode" errors={errors.mode}>
        <select id="mode" name="mode" defaultValue={shipment?.mode ?? "AIR"} className="h-8 border border-input bg-background px-2 text-xs">
          <option value="AIR">Air</option>
          <option value="OCEAN">Ocean</option>
        </select>
      </Field>
      <div className="hidden md:block" />
      <Field id="shipperName" label="Shipper" errors={errors.shipperName}>
        <Input id="shipperName" name="shipperName" defaultValue={shipment?.shipperName} required />
      </Field>
      <Field id="consigneeName" label="Consignee" errors={errors.consigneeName}>
        <Input id="consigneeName" name="consigneeName" defaultValue={shipment?.consigneeName} required />
      </Field>
      <Field id="originPort" label="Origin" errors={errors.originPort}>
        <Input id="originPort" name="originPort" defaultValue={shipment?.originPort} placeholder="DAC – Dhaka" required />
      </Field>
      <Field id="destinationPort" label="Destination" errors={errors.destinationPort}>
        <Input id="destinationPort" name="destinationPort" defaultValue={shipment?.destinationPort} placeholder="FRA – Frankfurt" required />
      </Field>
      <Field id="carrier" label="Carrier" errors={errors.carrier}>
        <Input id="carrier" name="carrier" defaultValue={shipment?.carrier ?? ""} />
      </Field>
      <Field id="masterRef" label="AWB / B/L number" errors={errors.masterRef}>
        <Input id="masterRef" name="masterRef" defaultValue={shipment?.masterRef ?? ""} />
      </Field>
      <Field id="etd" label="ETD" errors={errors.etd}>
        <Input id="etd" name="etd" type="date" defaultValue={toDateInputValue(shipment?.etd ?? null)} />
      </Field>
      <Field id="eta" label="ETA" errors={errors.eta}>
        <Input id="eta" name="eta" type="date" defaultValue={toDateInputValue(shipment?.eta ?? null)} />
      </Field>
      <Field id="pieces" label="Pieces" errors={errors.pieces}>
        <Input id="pieces" name="pieces" type="number" min={0} step={1} defaultValue={shipment?.pieces ?? ""} />
      </Field>
      <Field id="weightKg" label="Weight (kg)" errors={errors.weightKg}>
        <Input id="weightKg" name="weightKg" type="number" min={0} step="0.01" defaultValue={shipment?.weightKg ?? ""} />
      </Field>
      <div className="md:col-span-2">
        <Field id="notes" label="Internal notes (never shown publicly)" errors={errors.notes}>
          <Textarea id="notes" name="notes" defaultValue={shipment?.notes ?? ""} rows={3} />
        </Field>
      </div>
      {!state.ok && state.message && <p className="text-sm text-destructive md:col-span-2">{state.message}</p>}
      <div className="md:col-span-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
```
Note: a Prisma `Shipment` has `weightKg: Decimal | null`, and Decimal cannot be serialized to a client component, hence `FormShipment`. The detail page builds it as `{ ...shipment, weightKg: shipment.weightKg?.toString() ?? null }`.

- [ ] **Step 3: Write `components/admin/event-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";
import { toDateTimeInputValue } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/field-error";
import { SubmitButton } from "@/components/admin/submit-button";

export function EventForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) {
      toast.success("Event added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Event</Label>
        <select id="type" name="type" className="h-8 border border-input bg-background px-2 text-xs" defaultValue="IN_TRANSIT">
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_LABELS[t]}</option>
          ))}
        </select>
        <FieldError errors={errors.type} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">When (UTC)</Label>
        <Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={toDateTimeInputValue(new Date())} required />
        <FieldError errors={errors.occurredAt} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="DAC" />
        <FieldError errors={errors.location} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Public note</Label>
        <Input id="note" name="note" placeholder="Required for exceptions" />
        <FieldError errors={errors.note} />
      </div>
      <div className="md:col-span-4">
        <SubmitButton size="sm" pendingText="Adding…">Add event</SubmitButton>
      </div>
    </form>
  );
}
```
The `datetime-local` value has no timezone; the server parses it with `new Date()` in the server's zone. Hosted servers run UTC, hence the "(UTC)" label. Accepted for v1.

- [ ] **Step 4: Write the delete dialog and the admin event list**

`components/admin/delete-shipment-button.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/admin/submit-button";

export function DeleteShipmentButton({ action, trackingNumber }: { action: () => Promise<void>; trackingNumber: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete shipment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {trackingNumber}?</DialogTitle>
          <DialogDescription>This removes the shipment and all its events. The public tracking link stops working.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
          <form action={action}>
            <SubmitButton variant="destructive" size="sm" pendingText="Deleting…">Delete</SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Check `npx shadcn add --view dialog` for whether `DialogTrigger`/`DialogClose` use `render` (Base UI) or `asChild`; use whichever the generated file supports.

`components/admin/admin-event-list.tsx` (server component; each row has its own `ActionForm` for delete):
```tsx
import type { ActionResult } from "@/lib/validation/form";
import type { ShipmentEvent } from "@/lib/generated/prisma/client";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";

type Props = {
  events: ShipmentEvent[];  // newest first
  deleteAction: (eventId: string) => (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function AdminEventList({ events, deleteAction }: Props) {
  return (
    <ul className="divide-y divide-border border border-border">
      {events.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-4 p-3 text-sm">
          <div>
            <div className="font-medium">{EVENT_LABELS[e.type]}{e.location ? ` · ${e.location}` : ""}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</div>
            {e.note && <div className="mt-1 text-xs">{e.note}</div>}
          </div>
          <ActionForm action={deleteAction(e.id)} successMessage="Event deleted">
            <SubmitButton variant="ghost" size="xs" pendingText="…">Delete</SubmitButton>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}
```
`deleteAction` is a *server-side* function that returns a bound Server Action; it is called during server rendering, so only the bound action crosses to the client. The detail page passes `(eventId) => deleteEventAction.bind(null, shipment.id, eventId)`.

- [ ] **Step 5: Write the pages**

`app/(admin)/admin/shipments/new/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/dal";
import { createShipmentAction } from "@/actions/shipments";
import { ShipmentForm } from "@/components/admin/shipment-form";

export default async function NewShipmentPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">New shipment</h1>
      <ShipmentForm action={createShipmentAction} submitLabel="Create shipment" />
    </div>
  );
}
```

`app/(admin)/admin/not-found.tsx`:
```tsx
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <p>That record does not exist.</p>
      <Link href="/admin" className="underline underline-offset-4">Back to shipments</Link>
    </div>
  );
}
```

`app/(admin)/admin/shipments/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/dal";
import { getShipmentById } from "@/lib/shipments/service";
import { deleteShipmentAction, regenerateShareTokenAction, updateShipmentAction } from "@/actions/shipments";
import { addEventAction, deleteEventAction } from "@/actions/events";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { EventForm } from "@/components/admin/event-form";
import { AdminEventList } from "@/components/admin/admin-event-list";
import { CopyButton } from "@/components/admin/copy-button";
import { DeleteShipmentButton } from "@/components/admin/delete-shipment-button";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Separator } from "@/components/ui/separator";

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ShipmentDetailPage(props: PageProps<"/admin/shipments/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const origin = await baseUrl();
  const shareUrl = `${origin}/t/${shipment.shareToken}`;
  const trackUrl = `${origin}/track/${shipment.trackingNumber}`;
  const formShipment = { ...shipment, weightKg: shipment.weightKg?.toString() ?? null };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg font-semibold">{shipment.trackingNumber}</h1>
          <StatusBadge status={shipment.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={shipment.trackingNumber} label="Tracking number" />
          <CopyButton value={trackUrl} label="Tracking link" />
          <CopyButton value={shareUrl} label="Share link" />
          <ActionForm action={regenerateShareTokenAction.bind(null, shipment.id)} successMessage="Share link regenerated">
            <SubmitButton variant="outline" size="sm" pendingText="…">Regenerate share link</SubmitButton>
          </ActionForm>
          <DeleteShipmentButton action={deleteShipmentAction.bind(null, shipment.id)} trackingNumber={shipment.trackingNumber} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Events</h2>
        <EventForm action={addEventAction.bind(null, shipment.id)} />
        <AdminEventList events={shipment.events} deleteAction={(eventId) => deleteEventAction.bind(null, shipment.id, eventId)} />
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Details</h2>
        <ShipmentForm action={updateShipmentAction.bind(null, shipment.id)} shipment={formShipment} submitLabel="Save changes" />
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Confirm the button-style actions match `ActionForm`**

`ActionForm` calls its action as `(prev, formData)`. Confirm `regenerateShareTokenAction(id, _prev, _formData)` in `actions/shipments.ts` and `deleteEventAction(shipmentId, eventId, _prev, _formData)` in `actions/events.ts` have those trailing parameters (they were written that way in Tasks 7 and 8); if not, add them.

- [ ] **Step 7: Verify in the browser**

`npm run dev`, sign in, then:
1. `/admin/shipments/new` → submit empty → inline "Required" errors. Fill in a valid shipment → redirected to its detail page with a BOOKED badge and one event.
2. Add event `Departed origin`, location `DAC` → appears at the top; badge changes to "Departed origin"; toast shown.
3. Add `Exception` with an empty note → inline "A note is required for exceptions".
4. Delete the `Departed origin` event → badge returns to "Booked". Try deleting the last `Booked` event → toast error "A shipment must keep at least one event".
5. Edit carrier, save → toast "Shipment saved", value persists on reload.
6. Copy share link → toast. Regenerate share link → the copied URL changes on reload.
7. `curl -s http://localhost:3000/api/track/<number>` reflects the current status and events.
8. Delete shipment → confirm dialog → back at `/admin` without it.
Stop the dev server.

- [ ] **Step 8: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add components/admin app/(admin) actions
git commit -m "feat: add shipment create/edit forms, event management, and detail page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Admin users

**Files:**
- Create: `lib/users/service.ts`, `actions/users.ts`, `components/admin/user-form.tsx`, `app/(admin)/admin/users/page.tsx`
- Test: `tests/integration/users-service.test.ts`

**Interfaces:**
- Consumes: `CreateUserInput`, `hashPassword`, `prisma`, `requireAdmin`, `ActionForm`, `SubmitButton`, `FieldError`.
- Produces (from `@/lib/users/service`):
  ```ts
  export async function listUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date }[]>;
  export async function createUser(input: CreateUserInput): Promise<{ ok: true; id: string } | { ok: false; fieldErrors: Record<string, string[]> }>;
  export async function deleteUser(id: string, currentUserId: string): Promise<{ ok: true } | { ok: false; message: string }>;
  ```
- Produces (from `@/actions/users`): `createUserAction(prev, formData)`, `deleteUserAction(id, prev, formData)`.

- [ ] **Step 1: Write the failing tests**

`tests/integration/users-service.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createUser, deleteUser, listUsers } from "@/lib/users/service";
import { verifyCredentials } from "@/lib/auth/credentials";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("user service", () => {
  beforeEach(resetDb);

  it("creates a user with a bcrypt hash that verifies", async () => {
    const r = await createUser({ name: "Ops", email: "ops@example.com", password: "longenough" });
    expect(r.ok).toBe(true);
    const row = await prisma.user.findUniqueOrThrow({ where: { email: "ops@example.com" } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyCredentials("ops@example.com", "longenough")).not.toBeNull();
  });

  it("maps a duplicate email to a field error", async () => {
    await createUser({ name: "Ops", email: "ops@example.com", password: "longenough" });
    const r = await createUser({ name: "Ops 2", email: "ops@example.com", password: "longenough" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email?.[0]).toMatch(/already/i);
  });

  it("refuses to delete yourself but deletes others", async () => {
    const me = await createUser({ name: "Me", email: "me@example.com", password: "longenough" });
    const other = await createUser({ name: "Other", email: "other@example.com", password: "longenough" });
    if (!me.ok || !other.ok) throw new Error("setup");
    expect((await deleteUser(me.id, me.id)).ok).toBe(false);
    expect(await deleteUser(other.id, me.id)).toEqual({ ok: true });
    expect((await listUsers()).map((u) => u.email)).toEqual(["me@example.com"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/integration/users-service.test.ts` → FAIL, module not found (or skipped).

- [ ] **Step 3: Write `lib/users/service.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/credentials";
import type { CreateUserInput } from "@/lib/validation/user";

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true; id: string } | { ok: false; fieldErrors: Record<string, string[]> }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return { ok: false, fieldErrors: { email: ["An admin with this email already exists"] } };
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
    select: { id: true },
  });
  return { ok: true, id: user.id };
}

export async function deleteUser(
  id: string,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (id === currentUserId) return { ok: false, message: "You cannot delete your own account" };
  const deleted = await prisma.user.deleteMany({ where: { id } });
  if (deleted.count === 0) return { ok: false, message: "User not found" };
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/integration/users-service.test.ts` → PASS (3 tests).

- [ ] **Step 5: Write `actions/users.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createUser, deleteUser } from "@/lib/users/service";
import { createUserSchema } from "@/lib/validation/user";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(createUserSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const result = await createUser(parsed.data);
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const result = await deleteUser(id, me.id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
```

- [ ] **Step 6: Write the form and page**

`components/admin/user-form.tsx`:
```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/actions/users";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/field-error";
import { SubmitButton } from "@/components/admin/submit-button";

export function UserForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) {
      toast.success("Admin added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
        <FieldError errors={errors.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError errors={errors.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <FieldError errors={errors.password} />
      </div>
      <div className="md:col-span-3">
        <SubmitButton size="sm" pendingText="Adding…">Add admin</SubmitButton>
      </div>
    </form>
  );
}
```

`app/(admin)/admin/users/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users/service";
import { deleteUserAction } from "@/actions/users";
import { formatDate } from "@/lib/format";
import { UserForm } from "@/components/admin/user-form";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Admins</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Added</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name}{u.id === me.id ? " (you)" : ""}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{formatDate(u.createdAt)}</TableCell>
              <TableCell className="text-right">
                {u.id !== me.id && (
                  <ActionForm action={deleteUserAction.bind(null, u.id)} successMessage="Admin removed">
                    <SubmitButton variant="ghost" size="xs" pendingText="…">Remove</SubmitButton>
                  </ActionForm>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Add admin</h2>
        <UserForm />
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Verify in the browser**

`npm run dev`, sign in, `/admin/users`: add an admin (duplicate email shows the inline error), sign out, sign in as the new admin, remove the other admin from the list (your own row has no Remove button). Stop the dev server.

- [ ] **Step 8: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add lib/users actions/users.ts components/admin/user-form.tsx app/(admin)/admin/users tests/integration/users-service.test.ts
git commit -m "feat: add admin user management

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Public landing and tracking pages

**Files:**
- Delete: `app/page.tsx`
- Create: `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `app/(public)/track/[trackingNumber]/page.tsx`, `app/(public)/t/[shareToken]/page.tsx`
- Create: `components/tracking/track-search.tsx`, `components/tracking/tracking-view.tsx`, `components/tracking/event-timeline.tsx`

**Interfaces:**
- Consumes: `findPublicShipmentByTrackingNumber`, `findPublicShipmentByToken`, `PublicShipment`, `StatusBadge`, `EVENT_LABELS`, `formatDate`, `formatDateTime`, `modeLabel`, `normalizeTrackingNumber`, `TRACKING_NUMBER_RE`.
- Produces: `TrackingView({ shipment }: { shipment: PublicShipment })`, `EventTimeline({ events }: { events: PublicEvent[] })`, `TrackSearch({ defaultValue? })`.

- [ ] **Step 1: Public layout and landing page**

Delete the starter page:
```bash
git rm app/page.tsx
```

`app/(public)/layout.tsx`:
```tsx
import Link from "next/link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">Export Cargo Hub</Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-10">{children}</main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        Admin? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
      </footer>
    </div>
  );
}
```

`components/tracking/track-search.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TrackSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  return (
    <form
      className="flex w-full max-w-lg gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = normalizeTrackingNumber(value);
        if (n) router.push(`/track/${encodeURIComponent(n)}`);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ECH-2026-00042"
        aria-label="Tracking number"
        className="h-10 font-mono text-sm"
        autoFocus
      />
      <Button type="submit" size="lg">Track</Button>
    </form>
  );
}
```

`app/(public)/page.tsx`:
```tsx
import { TrackSearch } from "@/components/tracking/track-search";

export default function HomePage() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Track your shipment</h1>
        <p className="text-sm text-muted-foreground">Enter the tracking number from your booking confirmation.</p>
      </div>
      <TrackSearch />
    </div>
  );
}
```

- [ ] **Step 2: Timeline and tracking view**

`components/tracking/event-timeline.tsx`:
```tsx
import type { PublicEvent } from "@/lib/tracking/public";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EventTimeline({ events }: { events: PublicEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
      {events.map((e, i) => (
        <li key={`${e.type}-${e.occurredAt}-${i}`} className="relative pb-6 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[25px] top-1 size-2.5 border bg-background",
              i === 0 ? "border-foreground bg-foreground" : "border-border",
              e.type === "EXCEPTION" && "border-amber-500 bg-amber-500",
            )}
          />
          <div className={cn("text-sm", i === 0 ? "font-semibold" : "font-medium")}>
            {EVENT_LABELS[e.type]}
            {e.location && <span className="font-normal text-muted-foreground"> · {e.location}</span>}
          </div>
          <div className="text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</div>
          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
```

`components/tracking/tracking-view.tsx`:
```tsx
import type { PublicShipment } from "@/lib/tracking/public";
import { formatDate, modeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/tracking/status-badge";
import { EventTimeline } from "@/components/tracking/event-timeline";

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export function TrackingView({ shipment }: { shipment: PublicShipment }) {
  return (
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3 border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{modeLabel(shipment.mode)} freight</div>
            <h1 className="font-mono text-xl font-semibold">{shipment.trackingNumber}</h1>
          </div>
          <StatusBadge status={shipment.status} className="text-sm" />
        </div>
        <div className="text-base">
          {shipment.originPort} <span className="text-muted-foreground">→</span> {shipment.destinationPort}
        </div>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Fact label="Shipper" value={shipment.shipperName} />
          <Fact label="Consignee" value={shipment.consigneeName} />
          <Fact label="Carrier" value={shipment.carrier} />
          <Fact label={shipment.mode === "AIR" ? "AWB" : "B/L"} value={shipment.masterRef} />
          <Fact label="ETD" value={formatDate(shipment.etd)} />
          <Fact label="ETA" value={formatDate(shipment.eta)} />
          <Fact label="Pieces" value={shipment.pieces} />
          <Fact label="Weight" value={shipment.weightKg ? `${shipment.weightKg} kg` : null} />
        </dl>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Shipment history</h2>
        <EventTimeline events={shipment.events} />
      </section>
    </article>
  );
}
```

- [ ] **Step 3: The two tracking routes**

`app/(public)/track/[trackingNumber]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export async function generateMetadata(props: PageProps<"/track/[trackingNumber]">): Promise<Metadata> {
  const { trackingNumber } = await props.params;
  return { title: `${normalizeTrackingNumber(decodeURIComponent(trackingNumber))} · Export Cargo Hub` };
}

export default async function TrackPage(props: PageProps<"/track/[trackingNumber]">) {
  const { trackingNumber } = await props.params;
  const input = decodeURIComponent(trackingNumber);
  const shipment = await findPublicShipmentByTrackingNumber(input);

  if (!shipment) {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-10 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">No shipment found</h1>
          <p className="text-sm text-muted-foreground">
            Nothing matches <span className="font-mono">{normalizeTrackingNumber(input)}</span>. Check the number and try again.
          </p>
        </div>
        <TrackSearch defaultValue={normalizeTrackingNumber(input)} />
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
```

`app/(public)/t/[shareToken]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { findPublicShipmentByToken } from "@/lib/tracking/queries";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export const metadata: Metadata = { title: "Shipment · Export Cargo Hub", robots: { index: false } };

export default async function SharePage(props: PageProps<"/t/[shareToken]">) {
  const { shareToken } = await props.params;
  const shipment = await findPublicShipmentByToken(shareToken);

  if (!shipment) {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-10 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">This link is no longer valid</h1>
          <p className="text-sm text-muted-foreground">The share link may have been regenerated. Ask the sender for a new one, or track by number.</p>
        </div>
        <TrackSearch />
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
```

- [ ] **Step 4: Verify in the browser**

`npm run dev`, then:
1. `/` shows the search box. Enter a real number → `/track/ECH-…` renders header facts, badge, and timeline newest-first with the latest event bold.
2. Enter `ech-2026-99999` → "No shipment found" with the search prefilled.
3. Paste the share link copied from the admin detail page → same view. Regenerate the token in admin, reload the old link → "This link is no longer valid".
4. View page source of `/track/…` and confirm no `shareToken` or internal notes text appears.
5. Resize to ~400px wide: no horizontal scroll, facts grid collapses to two columns.
Stop the dev server.

- [ ] **Step 5: Lint, typecheck, commit**

```bash
npm run lint && npx next typegen && npx tsc --noEmit
git add app/(public) components/tracking
git commit -m "feat: add public landing and tracking pages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Error boundaries, README, and final verification

**Files:**
- Create: `app/error.tsx`, `app/(admin)/admin/error.tsx`
- Modify: `README.md`
- Delete: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg` (unused starter assets)

- [ ] **Step 1: Error boundaries**

`app/error.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">Please try again. If it keeps happening, contact the operator.</p>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </main>
  );
}
```

`app/(admin)/admin/error.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.digest ? `Reference: ${error.digest}` : error.message}</p>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </div>
  );
}
```

- [ ] **Step 2: Remove starter assets**

```bash
git rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Step 3: Update `README.md`**

Replace the "Status" callout, "Getting started", "Scripts", "Project structure", and "Current state" sections so they describe what now exists. Required content:

- Status: v1 shipment tracking is implemented; list the three surfaces (public tracking by number or share link, JSON endpoint, admin).
- Getting started: `npm install`, copy `.env.example` to `.env` and fill `DATABASE_URL`, `SESSION_SECRET` (`openssl rand -base64 48`), `ADMIN_*`; then `npm run db:push`, `npm run db:seed`, `npm run dev`; sign in at `/login`.
- Scripts table: add `npm test`, `npm run db:push`, `npm run db:generate`, `npm run db:seed`; note `TEST_DATABASE_URL` enables integration tests and that the test DB needs `DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push` once.
- Project structure: mirror the "File structure" block at the top of this plan.
- Routes table: `/`, `/track/[trackingNumber]`, `/t/[shareToken]`, `/api/track/[trackingNumber]`, `/login`, `/admin`, `/admin/shipments/new`, `/admin/shipments/[id]`, `/admin/users`.
- A "Data model" paragraph: status is derived from the latest event and cached on the shipment; tracking numbers are `ECH-YYYY-NNNNN`; share tokens are 32 random bytes and can be regenerated.
- Note that `prisma` is pinned to 7.10.0 to match `@prisma/client` and why (the 8.x package is the new platform CLI beta).
- Remove the "Not built yet" list and the Zustand/TanStack "planned" rows (say they are not used in v1).

- [ ] **Step 4: Full verification**

```bash
npm run lint
npx next typegen && npx tsc --noEmit
npm test
npm run build
```
Expected: lint clean, no type errors, all tests pass (integration ones skipped only if `TEST_DATABASE_URL` is unset), and `next build` succeeds listing the routes above. Paste the test summary and build route list into the commit body if anything was skipped.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add error boundaries, update README, remove starter assets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Done criteria

- Anonymous user: `/` → enter number → tracking page; share link works; JSON endpoint returns the allow-listed shape; nothing internal is exposed.
- Admin: sign in, create shipment, add/delete events, edit header, regenerate share link, delete shipment, manage admins, sign out.
- `npm run lint`, `npx next typegen && npx tsc --noEmit`, `npm test`, `npm run build` all pass.
