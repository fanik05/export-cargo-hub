import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createShipment,
  deleteShipment,
  getShipmentById,
  listShipments,
  regenerateShareToken,
  updateShipment,
} from "@/lib/shipments/service";
import type { ShipmentInput } from "@/lib/validation/shipment";
import { hasTestDb, resetDb } from "../helpers/db";

const base: ShipmentInput = {
  mode: "AIR",
  shipperName: "Acme",
  consigneeName: "Berlin Imports",
  originPort: "DAC",
  destinationPort: "FRA",
  carrier: null,
  masterRef: null,
  etd: null,
  eta: null,
  pieces: null,
  weightKg: null,
  notes: null,
};

describe.skipIf(!hasTestDb)("shipment service", () => {
  beforeEach(resetDb);

  it("creates sequential tracking numbers and a BOOKED event", async () => {
    const year = new Date().getFullYear();
    const a = await createShipment(base);
    const b = await createShipment(base);
    expect(a.trackingNumber).toBe(`ECH-${year}-00001`);
    expect(b.trackingNumber).toBe(`ECH-${year}-00002`);
    const full = await getShipmentById(a.id);
    expect(full?.status).toBe("BOOKED");
    expect(full?.events.map((e) => e.type)).toEqual(["BOOKED"]);
    expect(full?.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("survives concurrent creates without duplicate numbers", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => createShipment(base)));
    const numbers = new Set(results.map((r) => r.trackingNumber));
    expect(numbers.size).toBe(5);
  });

  it("updates header fields", async () => {
    const { id } = await createShipment(base);
    await updateShipment(id, { ...base, carrier: "Emirates SkyCargo", pieces: 4, weightKg: 88.25 });
    const s = await getShipmentById(id);
    expect(s?.carrier).toBe("Emirates SkyCargo");
    expect(s?.pieces).toBe(4);
    expect(s?.weightKg?.toString()).toBe("88.25");
  });

  it("regenerates the share token", async () => {
    const { id } = await createShipment(base);
    const before = (await getShipmentById(id))!.shareToken;
    const after = await regenerateShareToken(id);
    expect(after).not.toBe(before);
    expect((await getShipmentById(id))!.shareToken).toBe(after);
  });

  it("deletes a shipment and cascades events", async () => {
    const { id } = await createShipment(base);
    await deleteShipment(id);
    expect(await getShipmentById(id)).toBeNull();
    expect(await prisma.shipmentEvent.count()).toBe(0);
  });

  it("returns false updating a shipment that does not exist", async () => {
    expect(await updateShipment("nope", base)).toBe(false);
  });

  it("returns null regenerating the share token for a shipment that does not exist", async () => {
    expect(await regenerateShareToken("nope")).toBeNull();
  });

  it("resolves without throwing deleting a shipment that does not exist", async () => {
    await expect(deleteShipment("nope")).resolves.toBeUndefined();
  });

  it("lists with search, status filter, and paging", async () => {
    for (let i = 0; i < 3; i++) await createShipment({ ...base, shipperName: `Shipper ${i}` });
    const { id } = await createShipment({ ...base, shipperName: "Zeta", masterRef: "MAWB-777" });
    await prisma.shipment.update({ where: { id }, data: { status: "DELIVERED" } });

    expect((await listShipments({})).rows).toHaveLength(4);
    expect((await listShipments({ q: "mawb-777" })).rows.map((r) => r.shipperName)).toEqual(["Zeta"]);
    expect((await listShipments({ q: "Shipper 1" })).rows).toHaveLength(1);
    expect((await listShipments({ status: "DELIVERED" })).rows.map((r) => r.shipperName)).toEqual(["Zeta"]);
    expect((await listShipments({ page: 2 })).rows).toHaveLength(0);
    expect((await listShipments({})).hasMore).toBe(false);
  });
});
