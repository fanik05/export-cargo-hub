import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "At least 8 characters").max(200),
});

export type CreateUserInput = z.output<typeof createUserSchema>;
