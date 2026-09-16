import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { shipmentWithEventsArgs, toPublicShipment, type PublicShipment } from "@/lib/tracking/public";

export async function findPublicShipmentByTrackingNumber(input: string): Promise<PublicShipment | null> {
  const trackingNumber = normalizeTrackingNumber(input);
  if (!trackingNumber) return null;
  const s = await prisma.shipment.findUnique({ where: { trackingNumber }, ...shipmentWithEventsArgs });
  return s ? toPublicShipment(s) : null;
}

export async function findPublicShipmentByToken(token: string): Promise<PublicShipment | null> {
  if (!token) return null;
  const s = await prisma.shipment.findUnique({ where: { shareToken: token }, ...shipmentWithEventsArgs });
  return s ? toPublicShipment(s) : null;
}
