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
