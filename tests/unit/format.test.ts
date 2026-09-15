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
