import { z } from "zod";

const safeNext = z
  .string()
  .optional()
  .transform((v) => (v && /^\/(?![/\\])/.test(v) ? v : "/admin"));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Required"),
  next: safeNext,
});

export type LoginInput = z.output<typeof loginSchema>;
