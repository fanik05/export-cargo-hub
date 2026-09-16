"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createUser, deleteUser } from "@/lib/users/service";
import { createUserSchema } from "@/lib/validation/user";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(createUserSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const result = await createUser(parsed.data);
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const result = await deleteUser(id, me.id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
