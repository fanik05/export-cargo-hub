import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("maps a unique-constraint violation from a racing create to the same field error", async () => {
    await createUser({ name: "Ops", email: "race@example.com", password: "longenough" });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
    try {
      const r = await createUser({ name: "Ops 2", email: "race@example.com", password: "longenough" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fieldErrors.email?.[0]).toMatch(/already/i);
    } finally {
      vi.restoreAllMocks();
    }
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
