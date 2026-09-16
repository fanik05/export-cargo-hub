import { z } from "zod";
import { optionalDate, optionalNumber, optionalText } from "@/lib/validation/form";

export const shipmentSchema = z.object({
  mode: z.enum(["AIR", "OCEAN"], { message: "Choose air or ocean" }),
  shipperName: z.string().trim().min(1, "Required").max(200),
  consigneeName: z.string().trim().min(1, "Required").max(200),
  originPort: z.string().trim().min(1, "Required").max(200),
  destinationPort: z.string().trim().min(1, "Required").max(200),
  carrier: optionalText,
  masterRef: optionalText,
  etd: optionalDate,
  eta: optionalDate,
  pieces: optionalNumber({ int: true, min: 0, max: 2_147_483_647 }),
  weightKg: optionalNumber({ min: 0, max: 99_999_999.99 }),
  notes: optionalText,
});

export type ShipmentInput = z.output<typeof shipmentSchema>;
