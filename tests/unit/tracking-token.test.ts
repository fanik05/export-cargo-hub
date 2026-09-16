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
