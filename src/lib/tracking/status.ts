import type { EventType } from "@/lib/generated/prisma/client";

export const EVENT_TYPES = [
  "BOOKED",
  "CARGO_RECEIVED",
  "DEPARTED_ORIGIN",
  "IN_TRANSIT",
  "ARRIVED_DESTINATION",
  "CUSTOMS_CLEARED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
] as const satisfies readonly EventType[];

export const EVENT_LABELS: Record<EventType, string> = {
  BOOKED: "Booked",
  CARGO_RECEIVED: "Cargo received",
  DEPARTED_ORIGIN: "Departed origin",
  IN_TRANSIT: "In transit",
  ARRIVED_DESTINATION: "Arrived at destination",
  CUSTOMS_CLEARED: "Customs cleared",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Exception",
};

export type StatusTone = "neutral" | "info" | "success" | "warning";

export const STATUS_TONE: Record<EventType, StatusTone> = {
  BOOKED: "neutral",
  CARGO_RECEIVED: "neutral",
  DEPARTED_ORIGIN: "info",
  IN_TRANSIT: "info",
  ARRIVED_DESTINATION: "info",
  CUSTOMS_CLEARED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  EXCEPTION: "warning",
};

type StatusEvent = { type: EventType; occurredAt: Date; createdAt: Date };

/** Status is the type of the latest event (occurredAt, then createdAt). */
export function deriveStatus(events: StatusEvent[]): EventType | null {
  let latest: StatusEvent | null = null;
  for (const e of events) {
    if (
      !latest ||
      e.occurredAt > latest.occurredAt ||
      (e.occurredAt.getTime() === latest.occurredAt.getTime() &&
        e.createdAt > latest.createdAt)
    ) {
      latest = e;
    }
  }
  return latest?.type ?? null;
}

export const TRACKING_NUMBER_RE = /^ECH-\d{4}-\d{5,}$/;

export function formatTrackingNumber(year: number, seq: number): string {
  return `ECH-${year}-${String(seq).padStart(5, "0")}`;
}

export function normalizeTrackingNumber(input: string): string {
  return input.trim().toUpperCase();
}

/** decodeURIComponent that returns the raw input instead of throwing on malformed escapes. */
export function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}
