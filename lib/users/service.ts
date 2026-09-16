import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/credentials";
import { Prisma } from "@/lib/generated/prisma/client";
import type { CreateUserInput } from "@/lib/validation/user";

const DUPLICATE_EMAIL_ERROR = { ok: false as const, fieldErrors: { email: ["An admin with this email already exists"] } };

function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true; id: string } | { ok: false; fieldErrors: Record<string, string[]> }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return DUPLICATE_EMAIL_ERROR;
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
      select: { id: true },
    });
    return { ok: true, id: user.id };
  } catch (err) {
    if (isUniqueConstraintViolation(err)) return DUPLICATE_EMAIL_ERROR;
    throw err;
  }
}

export async function deleteUser(
  id: string,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (id === currentUserId) return { ok: false, message: "You cannot delete your own account" };
  const deleted = await prisma.user.deleteMany({ where: { id } });
  if (deleted.count === 0) return { ok: false, message: "User not found" };
  return { ok: true };
}
