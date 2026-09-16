"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validation/auth";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return { ok: false, message: "Invalid email or password" };

  await createSession(user.id);
  redirect(parsed.data.next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
