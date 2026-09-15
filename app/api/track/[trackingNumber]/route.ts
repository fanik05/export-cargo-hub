import type { NextRequest } from "next/server";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/track/[trackingNumber]">) {
  const { trackingNumber } = await ctx.params;
  const shipment = await findPublicShipmentByTrackingNumber(trackingNumber);
  if (!shipment) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(shipment, { headers: { "Cache-Control": "no-store" } });
}
