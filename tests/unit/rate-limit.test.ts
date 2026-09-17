import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const WINDOW = 60_000;
const make = (limit = 3, maxKeys?: number) =>
  createRateLimiter({ limit, windowMs: WINDOW, maxKeys });

describe("createRateLimiter", () => {
  it("allows requests up to the limit and reports the remaining count", () => {
    const limiter = make(3);
    expect(limiter.check("a", 1_000)).toMatchObject({ ok: true, remaining: 2, limit: 3 });
    expect(limiter.check("a", 1_100)).toMatchObject({ ok: true, remaining: 1 });
    expect(limiter.check("a", 1_200)).toMatchObject({ ok: true, remaining: 0 });
  });

  it("blocks the request after the limit and never reports a negative remaining", () => {
    const limiter = make(2);
    limiter.check("a", 0);
    limiter.check("a", 0);
    const blocked = limiter.check("a", 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(limiter.check("a", 0).remaining).toBe(0);
  });

  it("reports the window end and whole seconds until it", () => {
    const limiter = make(1);
    const first = limiter.check("a", 5_000);
    expect(first.resetAt).toBe(5_000 + WINDOW);
    expect(first.retryAfterSeconds).toBe(60);

    const blocked = limiter.check("a", 5_000 + WINDOW - 1_500);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(2);
  });

  it("never reports a retryAfter below one second", () => {
    const limiter = make(1);
    limiter.check("a", 0);
    expect(limiter.check("a", WINDOW - 1).retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the old one has elapsed", () => {
    const limiter = make(2);
    limiter.check("a", 0);
    limiter.check("a", 0);
    expect(limiter.check("a", 0).ok).toBe(false);

    const next = limiter.check("a", WINDOW);
    expect(next.ok).toBe(true);
    expect(next.remaining).toBe(1);
    expect(next.resetAt).toBe(WINDOW * 2);
  });

  it("counts each key separately", () => {
    const limiter = make(1);
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("b", 0).ok).toBe(true);
    expect(limiter.check("a", 0).ok).toBe(false);
    expect(limiter.check("b", 0).ok).toBe(false);
  });

  it("drops expired keys rather than growing past maxKeys", () => {
    const limiter = make(5, 10);
    for (let i = 0; i < 10; i++) limiter.check(`old-${i}`, 0);
    expect(limiter.size()).toBe(10);

    // A request after every old window has closed should reclaim their slots.
    limiter.check("fresh", WINDOW + 1);
    expect(limiter.size()).toBe(1);
  });

  it("evicts the oldest key when every tracked window is still open", () => {
    const limiter = make(5, 10);
    for (let i = 0; i < 10; i++) limiter.check(`live-${i}`, i);
    limiter.check("newcomer", 20);

    expect(limiter.size()).toBeLessThanOrEqual(10);
    // "live-0" was evicted, so it is treated as a first request again.
    expect(limiter.check("live-0", 20).remaining).toBe(4);
  });

  it("forgets everything on reset", () => {
    const limiter = make(1);
    limiter.check("a", 0);
    limiter.reset();
    expect(limiter.size()).toBe(0);
    expect(limiter.check("a", 0).ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the first address in x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(clientKey(headers)).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent or empty", () => {
    expect(clientKey(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    const both = new Headers({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.4" });
    expect(clientKey(both)).toBe("198.51.100.4");
  });

  it("groups unidentifiable callers into one bucket rather than exempting them", () => {
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
