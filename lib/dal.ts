import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { PublicUser } from "@/lib/auth/credentials";

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
  return user;
});

/** The real auth gate. Call first in every admin page, layout, and Server Action. */
export const requireAdmin = cache(async (): Promise<PublicUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
