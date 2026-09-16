"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import * as shipments from "@/lib/shipments/service";
import { revalidateShipment } from "@/lib/shipments/revalidate";
import { shipmentSchema } from "@/lib/validation/shipment";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function createShipmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(shipmentSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { id } = await shipments.createShipment(parsed.data);
  revalidatePath("/admin");
  redirect(`/admin/shipments/${id}`);
}

export async function updateShipmentAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(shipmentSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const updated = await shipments.updateShipment(id, parsed.data);
  if (!updated) return { ok: false, message: "Shipment not found" };
  revalidateShipment(id);
  return { ok: true };
}

export async function deleteShipmentAction(id: string): Promise<void> {
  await requireAdmin();
  await shipments.deleteShipment(id);
  revalidateShipment(id);
  redirect("/admin");
}

export async function regenerateShareTokenAction(id: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const token = await shipments.regenerateShareToken(id);
  if (!token) return { ok: false, message: "Shipment not found" };
  revalidateShipment(id);
  return { ok: true };
}
