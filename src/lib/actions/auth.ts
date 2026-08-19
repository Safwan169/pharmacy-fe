"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export interface LoginState {
  /** Field-level problems, keyed by input name. */
  errors?: { email?: string; password?: string };
  /** A whole-form problem, e.g. wrong credentials or the API being down. */
  message?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      errors: {
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      },
    };
  }

  let token: string;
  try {
    const result = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: parsed.data,
    });
    token = result.access_token;
  } catch (error) {
    if (error instanceof ApiError) {
      // The API deliberately doesn't say whether it was the email or the
      // password, so neither do we — naming one would help an attacker
      // confirm which admin emails exist.
      return {
        message:
          error.status === 401
            ? "That email and password don't match. Please check them and try again."
            : error.message,
      };
    }
    throw error;
  }

  await createSession(token);

  // Return them to the page they were trying to reach, but only if it's a path
  // on this site — an absolute URL here would be an open redirect.
  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  redirect(target);
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
