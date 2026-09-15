import type { ShipmentMode } from "@/lib/generated/prisma/client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDate(d: Date | string | null): Date | null {
  if (d === null) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export function formatDate(d: Date | string | null): string {
  const date = toDate(d);
  if (!date) return "—";
  return `${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateTime(d: Date | string | null): string {
  const date = toDate(d);
  if (!date) return "—";
  return `${formatDate(date)}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

export function modeLabel(mode: ShipmentMode): string {
  return mode === "AIR" ? "Air" : "Ocean";
}

/** For <input type="date"> defaultValue. */
export function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** For <input type="datetime-local"> defaultValue. */
export function toDateTimeInputValue(d: Date): string {
  return d.toISOString().slice(0, 16);
}
