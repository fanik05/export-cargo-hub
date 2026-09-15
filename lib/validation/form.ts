import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> };

export const INITIAL_ACTION_STATE: ActionResult = { ok: false };

export function issuesToFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Converts FormData to a plain object (first value per key) and parses it. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; fieldErrors: Record<string, string[]> } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (!(key in raw)) raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: issuesToFieldErrors(result.error.issues) };
}

/** "" -> null, otherwise trimmed string. For optional text inputs. */
export const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s));

/** "" -> null, otherwise a Date. Accepts "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm". */
export const optionalDate = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === "") return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

export const requiredDate = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((s, ctx) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

/** "" -> null, otherwise a number. */
export function optionalNumber(opts: { int?: boolean; min?: number } = {}) {
  return z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (Number.isNaN(n) || (opts.int && !Number.isInteger(n)) || (opts.min !== undefined && n < opts.min)) {
        ctx.addIssue({ code: "custom", message: "Enter a valid number" });
        return z.NEVER;
      }
      return n;
    });
}
