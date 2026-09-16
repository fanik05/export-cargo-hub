import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findPublicShipmentByToken, findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("public tracking lookups", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.shipment.create({
      data: {
        trackingNumber: "ECH-2026-00001",
        shareToken: "tok_abc",
        mode: "AIR",
        status: "BOOKED",
        shipperName: "A",
        consigneeName: "B",
        originPort: "DAC",
        destinationPort: "FRA",
        notes: "internal",
        events: { create: { type: "BOOKED", occurredAt: new Date("2026-09-01T00:00:00Z") } },
      },
    });
  });

  it("finds by tracking number, case- and whitespace-insensitive", async () => {
    const s = await findPublicShipmentByTrackingNumber(" ech-2026-00001 ");
    expect(s?.trackingNumber).toBe("ECH-2026-00001");
    expect(s?.events).toHaveLength(1);
    expect(JSON.stringify(s)).not.toContain("internal");
  });

  it("finds by share token", async () => {
    expect((await findPublicShipmentByToken("tok_abc"))?.trackingNumber).toBe("ECH-2026-00001");
  });

  it("returns null for unknown values", async () => {
    expect(await findPublicShipmentByTrackingNumber("ECH-2026-99999")).toBeNull();
    expect(await findPublicShipmentByToken("nope")).toBeNull();
  });
});
