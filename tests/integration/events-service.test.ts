import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { addEvent, deleteEvent } from "@/lib/shipments/events";
import { createShipment, getShipmentById } from "@/lib/shipments/service";
import { hasTestDb, resetDb } from "../helpers/db";

const base = {
  mode: "AIR" as const, shipperName: "A", consigneeName: "B", originPort: "DAC", destinationPort: "FRA",
  carrier: null, masterRef: null, etd: null, eta: null, pieces: null, weightKg: null, notes: null,
};

describe.skipIf(!hasTestDb)("event service", () => {
  let shipmentId: string;
  beforeEach(async () => {
    await resetDb();
    shipmentId = (await createShipment(base)).id;
  });

  it("adding a later event updates the cached status", async () => {
    await addEvent(shipmentId, { type: "DEPARTED_ORIGIN", occurredAt: new Date(Date.now() + 60_000), location: "DAC", note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("DEPARTED_ORIGIN");
  });

  it("adding a back-dated event does not change the status", async () => {
    await addEvent(shipmentId, { type: "CARGO_RECEIVED", occurredAt: new Date("2020-01-01T00:00:00Z"), location: null, note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("BOOKED");
  });

  it("deleting the latest event rolls the status back", async () => {
    const { id } = await addEvent(shipmentId, { type: "DELIVERED", occurredAt: new Date(Date.now() + 60_000), location: null, note: null });
    expect((await getShipmentById(shipmentId))?.status).toBe("DELIVERED");
    expect(await deleteEvent(id)).toEqual({ ok: true });
    expect((await getShipmentById(shipmentId))?.status).toBe("BOOKED");
  });

  it("refuses to delete the only event", async () => {
    const only = (await prisma.shipmentEvent.findFirstOrThrow({ where: { shipmentId } })).id;
    const r = await deleteEvent(only);
    expect(r.ok).toBe(false);
    expect(await prisma.shipmentEvent.count({ where: { shipmentId } })).toBe(1);
  });

  it("returns a message for an unknown event id", async () => {
    expect((await deleteEvent("nope")).ok).toBe(false);
  });
});
