import "server-only";
import { prisma } from "@/lib/prisma";
import type { EventType, Prisma } from "@/lib/generated/prisma/client";
import { formatTrackingNumber } from "@/lib/tracking/status";
import { generateShareToken } from "@/lib/tracking/token";
import { shipmentWithEventsArgs, type ShipmentWithEvents } from "@/lib/tracking/public";
import type { ShipmentInput } from "@/lib/validation/shipment";

export const PAGE_SIZE = 50;

function headerData(input: ShipmentInput) {
  return {
    mode: input.mode,
    shipperName: input.shipperName,
    consigneeName: input.consigneeName,
    originPort: input.originPort,
    destinationPort: input.destinationPort,
    carrier: input.carrier,
    masterRef: input.masterRef,
    etd: input.etd,
    eta: input.eta,
    pieces: input.pieces,
    weightKg: input.weightKg,
    notes: input.notes,
  };
}

async function createOnce(input: ShipmentInput) {
  const year = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const seq = await tx.trackingSequence.upsert({
      where: { year },
      create: { year, last: 1 },
      update: { last: { increment: 1 } },
    });
    const trackingNumber = formatTrackingNumber(year, seq.last);
    const shipment = await tx.shipment.create({
      data: {
        ...headerData(input),
        trackingNumber,
        shareToken: generateShareToken(),
        status: "BOOKED",
        events: { create: { type: "BOOKED", occurredAt: new Date() } },
      },
      select: { id: true, trackingNumber: true },
    });
    return shipment;
  });
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
}

/** Creates the shipment, its first BOOKED event, and issues the next tracking number. Retries once on a unique-constraint race. */
export async function createShipment(input: ShipmentInput): Promise<{ id: string; trackingNumber: string }> {
  try {
    return await createOnce(input);
  } catch (err) {
    if (isUniqueViolation(err)) return createOnce(input);
    throw err;
  }
}

export async function updateShipment(id: string, input: ShipmentInput): Promise<boolean> {
  const result = await prisma.shipment.updateMany({ where: { id }, data: headerData(input) });
  return result.count > 0;
}

export async function deleteShipment(id: string): Promise<void> {
  await prisma.shipment.deleteMany({ where: { id } });
}

export async function regenerateShareToken(id: string): Promise<string | null> {
  const shareToken = generateShareToken();
  const result = await prisma.shipment.updateMany({ where: { id }, data: { shareToken } });
  return result.count > 0 ? shareToken : null;
}

export async function getShipmentById(id: string): Promise<ShipmentWithEvents | null> {
  return prisma.shipment.findUnique({ where: { id }, ...shipmentWithEventsArgs });
}

export type ShipmentListFilters = { q?: string; status?: EventType; page?: number };

const rowSelect = {
  id: true,
  trackingNumber: true,
  mode: true,
  status: true,
  shipperName: true,
  consigneeName: true,
  originPort: true,
  destinationPort: true,
  eta: true,
  updatedAt: true,
} satisfies Prisma.ShipmentSelect;

export type ShipmentRow = Prisma.ShipmentGetPayload<{ select: typeof rowSelect }>;

export async function listShipments(f: ShipmentListFilters): Promise<{ rows: ShipmentRow[]; hasMore: boolean }> {
  const page = Math.max(1, f.page ?? 1);
  const q = f.q?.trim();
  const where: Prisma.ShipmentWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(q
      ? {
          OR: [
            { trackingNumber: { contains: q, mode: "insensitive" } },
            { shipperName: { contains: q, mode: "insensitive" } },
            { consigneeName: { contains: q, mode: "insensitive" } },
            { masterRef: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.shipment.findMany({
    where,
    select: rowSelect,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}
