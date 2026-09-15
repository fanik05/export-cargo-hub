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
