import { z } from "zod";
import { emailSchema } from "./common";

/**
 * Deliberately does NOT mirror the backend's password rules. Telling someone
 * signing in that their password "must be at least 8 characters" is useless —
 * they either know it or they don't — and it hints at the stored format. We
 * only check that something was typed; the API decides if it's right.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;
