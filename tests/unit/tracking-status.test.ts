import { describe, expect, it } from "vitest";
import {
  EVENT_LABELS,
  EVENT_TYPES,
  STATUS_TONE,
  TRACKING_NUMBER_RE,
  deriveStatus,
  formatTrackingNumber,
  normalizeTrackingNumber,
  safeDecode,
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

describe("safeDecode", () => {
  it("decodes well-formed input", () => {
    expect(safeDecode("ECH-2026-00042")).toBe("ECH-2026-00042");
  });

  it("returns the raw input instead of throwing on malformed escapes", () => {
    expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("decodes percent-encoded characters", () => {
    expect(safeDecode("ech%2D2026")).toBe("ech-2026");
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
