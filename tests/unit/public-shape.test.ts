import { describe, expect, it } from "vitest";
import { toPublicShipment } from "@/lib/tracking/public";

describe("toPublicShipment", () => {
  it("exposes only public fields and orders events newest first", () => {
    const shipment = {
      id: "cs_internal",
      trackingNumber: "ECH-2026-00001",
      shareToken: "secret-token",
      mode: "OCEAN",
      status: "DEPARTED_ORIGIN",
      shipperName: "A",
      consigneeName: "B",
      originPort: "CGP",
      destinationPort: "HAM",
      carrier: null,
      masterRef: "MAEU123",
      etd: new Date("2026-09-10T00:00:00Z"),
      eta: null,
      pieces: 3,
      weightKg: { toString: () => "120.50" },
      notes: "internal remark",
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [
        { id: "e1", shipmentId: "cs_internal", type: "BOOKED", occurredAt: new Date("2026-09-01T00:00:00Z"), location: null, note: null, createdAt: new Date() },
        { id: "e2", shipmentId: "cs_internal", type: "DEPARTED_ORIGIN", occurredAt: new Date("2026-09-10T00:00:00Z"), location: "CGP", note: "On MV Example", createdAt: new Date() },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pub = toPublicShipment(shipment as any);
    expect(Object.keys(pub).sort()).toEqual(
      ["carrier", "consigneeName", "destinationPort", "eta", "etd", "events", "masterRef", "mode", "originPort", "pieces", "shipperName", "status", "trackingNumber", "weightKg"].sort(),
    );
    expect(pub.weightKg).toBe("120.50");
    expect(pub.etd).toBe("2026-09-10T00:00:00.000Z");
    expect(pub.events.map((e) => e.type)).toEqual(["DEPARTED_ORIGIN", "BOOKED"]);
    expect(Object.keys(pub.events[0]).sort()).toEqual(["location", "note", "occurredAt", "type"]);
    expect(JSON.stringify(pub)).not.toContain("secret-token");
    expect(JSON.stringify(pub)).not.toContain("internal remark");
  });
});
