# Shipment Tracking — Design Spec

Date: 2026-09-15
Status: approved in brainstorming, awaiting written review

## 1. Goal

A stripped-down Flexport: admins create shipments and log milestone events; anyone
with a tracking number or share link can see a public tracking page. Nothing else
(no documents, customer accounts, notifications, or carrier integrations) in v1.

## 2. Decisions made

| Question | Decision |
| --- | --- |
| Public access | Both: lookup by tracking number **and** unguessable share link |
| Admin auth | Email + password stored in the DB, bcrypt hash, stateless signed cookie |
| Status model | Derived from the latest event; fixed event-type enum plus `EXCEPTION` |
| Database | Hosted Postgres; first admin created by a seed script; admins can add admins |
| Client state | None. Server Components + URL search params. No Zustand/TanStack yet |

## 3. Data model (Prisma)

```prisma
enum ShipmentMode { AIR  OCEAN }

enum EventType {
  BOOKED
  CARGO_RECEIVED
  DEPARTED_ORIGIN
  IN_TRANSIT
  ARRIVED_DESTINATION
  CUSTOMS_CLEARED
  OUT_FOR_DELIVERY
  DELIVERED
  EXCEPTION            // delay, hold, damage — note is required
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
}

model Shipment {
  id              String       @id @default(cuid())
  trackingNumber  String       @unique   // ECH-YYYY-NNNNN
  shareToken      String       @unique   // 32 random bytes, base64url
  mode            ShipmentMode
  shipperName     String
  consigneeName   String
  originPort      String       // free text, e.g. "DAC – Dhaka"
  destinationPort String
  carrier         String?
  masterRef       String?      // AWB or B/L number
  etd             DateTime?
  eta             DateTime?
  pieces          Int?
  weightKg        Decimal?     @db.Decimal(10, 2)
  notes           String?      // internal only, never rendered publicly
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  events          ShipmentEvent[]
}

model ShipmentEvent {
  id         String    @id @default(cuid())
  shipmentId String
  shipment   Shipment  @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  type       EventType
  occurredAt DateTime  // set by admin; form defaults to now
  location   String?
  note       String?   // public
  createdAt  DateTime  @default(now())
  @@index([shipmentId, occurredAt])
}

model TrackingSequence {
  year Int @id
  next Int @default(1)
}
```

Rules:

- **Status** of a shipment is the `type` of the event with the greatest `occurredAt`
  (ties broken by `createdAt`). Implemented as a pure function `deriveStatus(events)`.
- **Creating a shipment** inserts a `BOOKED` event in the same transaction, so status is
  never empty.
- **Tracking number** is `ECH-<year>-<5-digit zero-padded>`. The number is taken from
  `TrackingSequence` for the current year inside the create transaction
  (`UPDATE ... SET next = next + 1 RETURNING next`, upserting the row if absent).
- **Share token** is `crypto.randomBytes(32).toString("base64url")`. Can be regenerated
  from the admin detail page.
- `Shipment.notes` is internal; `ShipmentEvent.note` is public. Kept as separate fields so
  internal remarks cannot leak by accident.
- Deleting a shipment cascades its events. No soft delete.
- `EXCEPTION` events require a non-empty `note` (enforced by Zod).

## 4. Routes

### Public (no auth)

| Route | Purpose |
| --- | --- |
| `/` | Landing page with a single "Track your shipment" input. Submits to `/track/<number>` |
| `/track/[trackingNumber]` | Tracking page. Unknown number renders a not-found state in place |
| `/t/[shareToken]` | Same page, looked up by token |
| `/api/track/[trackingNumber]` | Route handler returning public JSON (see §6) |

`/track/*` and `/t/*` render one shared `TrackingView` component: header facts, current
status badge, and an event timeline sorted newest-first.

### Auth

| Route | Purpose |
| --- | --- |
| `/login` | Email + password form. Server Action `login` sets the cookie and redirects to `/admin` (or `?next=`) |
| `logout` action | Clears the cookie, redirects to `/login` |

### Admin (session required)

| Route | Purpose |
| --- | --- |
| `/admin` | Shipment list: tracking #, mode, shipper → consignee, origin → destination, ETA, status. Search (`q` matches tracking #, shipper, consignee, master ref) and `status` filter via URL search params. Limit 50 rows, "load more" via `?page=` |
| `/admin/shipments/new` | Create form; on success redirect to detail |
| `/admin/shipments/[id]` | Detail: editable header form, event timeline with per-event delete, "Add event" form, copy tracking # / share link, regenerate share token, delete shipment (confirm dialog) |
| `/admin/users` | List admins; add admin (name, email, password); delete another admin (not self) |

### Layouts

- `app/(public)/layout.tsx` — minimal header with wordmark, no nav.
- `app/(admin)/admin/layout.tsx` — calls `requireAdmin()`, renders nav (Shipments, Users)
  and a logout button with the signed-in name.

## 5. Server Actions

Files: `actions/auth.ts`, `actions/shipments.ts`, `actions/events.ts`, `actions/users.ts`.

Every action:

1. Calls `requireAdmin()` first (except `login`).
2. Parses `FormData` with a Zod schema from `lib/validation/*.ts`.
3. Returns `ActionResult`:
   ```ts
   type ActionResult =
     | { ok: true }
     | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
   ```
   or calls `redirect()` on success where navigation is wanted.
4. Calls `revalidatePath` for the affected admin and public routes.

Forms are client components using `useActionState`, rendering `fieldErrors` inline.

Actions:

| Action | Input | Behaviour |
| --- | --- | --- |
| `login` | email, password, next? | Verify bcrypt; generic error on failure; set cookie; redirect |
| `logout` | — | Clear cookie; redirect `/login` |
| `createShipment` | header fields | Transaction: sequence → shipment → `BOOKED` event. Redirect to detail |
| `updateShipment` | id + header fields | Update; revalidate |
| `deleteShipment` | id | Delete; redirect `/admin` |
| `regenerateShareToken` | id | New token; revalidate |
| `addEvent` | shipmentId, type, occurredAt, location?, note? | Insert; revalidate |
| `deleteEvent` | id | Refuse if it is the shipment's only event; else delete |
| `createUser` | name, email, password | bcrypt cost 12; unique-email error mapped to field error |
| `deleteUser` | id | Refuse if id === current user; else delete |

## 6. Public JSON shape

`GET /api/track/[trackingNumber]` → 200:

```json
{
  "trackingNumber": "ECH-2026-00042",
  "mode": "AIR",
  "status": "DEPARTED_ORIGIN",
  "shipperName": "…", "consigneeName": "…",
  "originPort": "…", "destinationPort": "…",
  "carrier": "…", "masterRef": "…",
  "etd": "2026-09-10T00:00:00.000Z", "eta": null,
  "pieces": 12, "weightKg": "340.50",
  "events": [
    { "type": "DEPARTED_ORIGIN", "occurredAt": "…", "location": "DAC", "note": null }
  ]
}
```

404 with `{ "error": "not_found" }` otherwise. `id`, `shareToken`, `notes`, and
`createdAt/updatedAt` are never included. A single `lib/tracking/public.ts` builds this
object for both the page and the route handler.

## 7. Auth and security

**Session cookie** `ech_session`: `jose` HS256 JWT `{ sub: userId, exp }`, 7 days,
`httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`. Signed with
`SESSION_SECRET`. `lib/session.ts` exports `createSession`, `getSession`, `destroySession`.

**Two layers**

- `proxy.ts` (Next 16's middleware) matches `/admin/:path*` and `/login`. No valid JWT on
  `/admin/*` → redirect `/login?next=<path>`. Valid JWT on `/login` → redirect `/admin`.
  Optimistic only; verifies the signature, does not hit the DB.
- `lib/dal.ts` exports `requireAdmin()`: verifies the JWT, loads the user via Prisma,
  `redirect("/login")` on any failure. Wrapped in React `cache()`. Called by the admin
  layout, every admin page, and every admin Server Action. This is the real gate.

**Passwords**: `bcryptjs`, cost 12, minimum 8 characters. Login error is always
"Invalid email or password".

**Seed**: `prisma/seed.ts` upserts the admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_NAME`. Script: `npm run db:seed` (`tsx prisma/seed.ts`).

**Public surface**: only the §6 fields leave the server. Sequential tracking numbers are
guessable by design (accepted). No rate limiting in v1.

**Env vars** (documented in `.env.example`): `DATABASE_URL`, `SESSION_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, optional `TEST_DATABASE_URL`.

## 8. Project layout

```
proxy.ts
prisma/schema.prisma, prisma/seed.ts
lib/prisma.ts          Prisma singleton with pg adapter
lib/session.ts         JWT cookie helpers
lib/dal.ts             requireAdmin(), getCurrentUser()
lib/validation/*.ts    Zod schemas (shipment, event, user, auth)
lib/tracking/status.ts deriveStatus, tracking-number formatting, labels
lib/tracking/public.ts toPublicShipment()
actions/*.ts           Server Actions
app/(public)/…         /, /track/[trackingNumber], /t/[shareToken]
app/(admin)/admin/…    list, new, [id], users
app/login/page.tsx
app/api/track/[trackingNumber]/route.ts
components/tracking/   TrackingView, StatusBadge, EventTimeline
components/admin/      ShipmentForm, EventForm, UserForm, ShipmentTable
components/ui/         shadcn primitives
```

## 9. Error handling

- Validation failures → `fieldErrors`; other failures → `message`. Actions never throw
  to the client except through `redirect()`.
- Unique-constraint race on `trackingNumber` is retried once inside `createShipment`.
- `app/error.tsx`, `app/(admin)/admin/error.tsx`, and `app/(admin)/admin/not-found.tsx`.
- Public tracking page shows an in-place "No shipment found for X" state rather than 404.

## 10. UI

- shadcn additions via the CLI (style `base-lyra`): `input`, `label`, `select`,
  `textarea`, `table`, `badge`, `card`, `dialog`, `alert`, `separator`, `sonner`.
- Public tracking page: status badge, vertical timeline, mode icon. Gets design care.
- Admin: dense, plain, tables and forms.
- Status labels and badge colours come from one map in `lib/tracking/status.ts`.

## 11. Testing

- **Vitest**, `npm test`.
- Unit (no DB): Zod schemas, `deriveStatus`, tracking-number formatting, session
  round-trip, `toPublicShipment` field allow-list.
- Integration (real Postgres via `TEST_DATABASE_URL`, tables truncated between tests):
  `createShipment` (sequence + BOOKED event), `addEvent` → status change, `login`
  success/failure, tracking lookup by number and token, `deleteEvent` last-event refusal.
  Skipped when `TEST_DATABASE_URL` is unset.
- No E2E in v1.

## 12. Out of scope (v1)

Documents/PDFs, customer accounts, email/SMS notifications, carrier API integration,
rate limiting, audit log, bulk import, pagination beyond the 50-row "load more".
