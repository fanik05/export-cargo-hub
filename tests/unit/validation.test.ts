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

  it("trims and lowercases padded email before validation", () => {
    const r = parseForm(createUserSchema, fd({ name: "Ops", email: "  OPS@Example.com  ", password: "longenough" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("ops@example.com");
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

  it("trims and lowercases padded email before validation", () => {
    const r = parseForm(loginSchema, fd({ email: "  OPS@Example.com  ", password: "x", next: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("ops@example.com");
  });
});
