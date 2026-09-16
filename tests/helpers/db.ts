import { prisma } from "@/lib/prisma";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/** Truncates every app table. Only ever runs against TEST_DATABASE_URL (see tests/setup.ts). */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ShipmentEvent", "Shipment", "TrackingSequence", "User" RESTART IDENTITY CASCADE',
  );
}
