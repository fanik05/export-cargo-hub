import { z } from "zod";
import { EVENT_TYPES } from "@/lib/tracking/status";
import { optionalText, requiredDate } from "@/lib/validation/form";

export const eventSchema = z
  .object({
    type: z.enum(EVENT_TYPES, { message: "Choose an event type" }),
    occurredAt: requiredDate,
    location: optionalText.optional().transform((v) => v ?? null),
    note: optionalText.optional().transform((v) => v ?? null),
  })
  .superRefine((data, ctx) => {
    if (data.type === "EXCEPTION" && !data.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "A note is required for exceptions" });
    }
  });

export type EventInput = z.output<typeof eventSchema>;
