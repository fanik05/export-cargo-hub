"use server";

import { requireAdmin } from "@/lib/dal";
import { addEvent, deleteEvent } from "@/lib/shipments/events";
import { revalidateShipment } from "@/lib/shipments/revalidate";
import { eventSchema } from "@/lib/validation/event";
import { parseForm, type ActionResult } from "@/lib/validation/form";

export async function addEventAction(shipmentId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  await addEvent(shipmentId, parsed.data);
  revalidateShipment(shipmentId);
  return { ok: true };
}

export async function deleteEventAction(shipmentId: string, eventId: string, _prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const result = await deleteEvent(eventId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidateShipment(shipmentId);
  return { ok: true };
}
