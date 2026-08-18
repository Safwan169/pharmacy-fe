import { z } from "zod";
import { emailSchema } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false),
});

/** What the form fields hold before validation (defaults may be absent). */
export type LoginFormValues = z.input<typeof loginSchema>;
/** What a successful parse yields — the shape the API receives. */
export type LoginInput = z.output<typeof loginSchema>;
