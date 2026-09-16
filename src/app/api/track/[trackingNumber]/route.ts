import type { NextRequest } from "next/server";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { safeDecode } from "@/lib/tracking/status";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/track/[trackingNumber]">) {
  const { trackingNumber } = await ctx.params;
  const shipment = await findPublicShipmentByTrackingNumber(safeDecode(trackingNumber));
  if (!shipment) {
    return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(shipment, { headers: { "Cache-Control": "no-store" } });
}
