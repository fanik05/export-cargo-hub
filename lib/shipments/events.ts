import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { deriveStatus } from "@/lib/tracking/status";
import type { EventInput } from "@/lib/validation/event";

type Tx = Prisma.TransactionClient;

/** Recomputes Shipment.status from its events. Must run inside the same transaction as the change. */
async function recomputeStatus(tx: Tx, shipmentId: string) {
  const events = await tx.shipmentEvent.findMany({
    where: { shipmentId },
    select: { type: true, occurredAt: true, createdAt: true },
  });
  const status = deriveStatus(events);
  if (status) {
    await tx.shipment.update({ where: { id: shipmentId }, data: { status } });
  }
}

export async function addEvent(
  shipmentId: string,
  input: EventInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({ where: { id: shipmentId }, select: { id: true } });
    if (!shipment) return { ok: false as const, message: "Shipment not found" };
    const event = await tx.shipmentEvent.create({
      data: {
        shipmentId,
        type: input.type,
        occurredAt: input.occurredAt,
        location: input.location,
        note: input.note,
      },
      select: { id: true },
    });
    await recomputeStatus(tx, shipmentId);
    return { ok: true as const, id: event.id };
  });
}

export async function deleteEvent(eventId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.shipmentEvent.findUnique({ where: { id: eventId }, select: { shipmentId: true } });
    if (!event) return { ok: false as const, message: "Event not found" };
    const count = await tx.shipmentEvent.count({ where: { shipmentId: event.shipmentId } });
    if (count <= 1) return { ok: false as const, message: "A shipment must keep at least one event" };
    await tx.shipmentEvent.delete({ where: { id: eventId } });
    await recomputeStatus(tx, event.shipmentId);
    return { ok: true as const };
  });
}
