import type { NextRequest } from "next/server";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { safeDecode } from "@/lib/tracking/status";
import { clientKey, trackLimiter, type RateLimitResult } from "@/lib/rate-limit";

function rateHeaders(decision: RateLimitResult): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(Math.ceil(decision.resetAt / 1000)),
  };
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/track/[trackingNumber]">) {
  // Counted before the lookup, so a miss costs an attacker the same as a hit
  // and enumeration never reaches the database.
  const decision = trackLimiter.check(clientKey(req.headers));
  if (!decision.ok) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { ...rateHeaders(decision), "Retry-After": String(decision.retryAfterSeconds) },
      },
    );
  }

  const { trackingNumber } = await ctx.params;
  const shipment = await findPublicShipmentByTrackingNumber(safeDecode(trackingNumber));
  if (!shipment) {
    return Response.json({ error: "not_found" }, { status: 404, headers: rateHeaders(decision) });
  }
  return Response.json(shipment, { headers: rateHeaders(decision) });
}
