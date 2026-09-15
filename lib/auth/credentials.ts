import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;

/** A precomputed hash so the "user not found" path still pays a bcrypt.compare, closing the login timing side channel. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_COST);

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
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, name: user.name, email: user.email };
}
