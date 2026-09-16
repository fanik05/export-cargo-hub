import type { EventType, Prisma, ShipmentMode } from "@/lib/generated/prisma/client";

export const shipmentWithEventsArgs = {
  include: { events: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }] } },
} satisfies Prisma.ShipmentDefaultArgs;

export type ShipmentWithEvents = Prisma.ShipmentGetPayload<typeof shipmentWithEventsArgs>;

export type PublicEvent = {
  type: EventType;
  occurredAt: string;
  location: string | null;
  note: string | null;
};

export type PublicShipment = {
  trackingNumber: string;
  mode: ShipmentMode;
  status: EventType;
  shipperName: string;
  consigneeName: string;
  originPort: string;
  destinationPort: string;
  carrier: string | null;
  masterRef: string | null;
  etd: string | null;
  eta: string | null;
  pieces: number | null;
  weightKg: string | null;
  events: PublicEvent[];
};

/** Explicit allow-list: nothing internal (id, shareToken, notes, timestamps) leaves the server. */
export function toPublicShipment(s: ShipmentWithEvents): PublicShipment {
  const events = [...s.events].sort(
    (a, b) =>
      b.occurredAt.getTime() - a.occurredAt.getTime() ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return {
    trackingNumber: s.trackingNumber,
    mode: s.mode,
    status: s.status,
    shipperName: s.shipperName,
    consigneeName: s.consigneeName,
    originPort: s.originPort,
    destinationPort: s.destinationPort,
    carrier: s.carrier,
    masterRef: s.masterRef,
    etd: s.etd ? s.etd.toISOString() : null,
    eta: s.eta ? s.eta.toISOString() : null,
    pieces: s.pieces,
    weightKg: s.weightKg === null ? null : s.weightKg.toString(),
    events: events.map((e) => ({
      type: e.type,
      occurredAt: e.occurredAt.toISOString(),
      location: e.location,
      note: e.note,
    })),
  };
}
