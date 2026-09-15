import { z } from "zod";

const safeNext = z
  .string()
  .optional()
  .transform((v) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/admin"));

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Required"),
  next: safeNext,
});

export type LoginInput = z.output<typeof loginSchema>;
