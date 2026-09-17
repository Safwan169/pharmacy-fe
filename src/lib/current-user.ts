import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import type { UserProfile } from "@/types";

/**
 * The signed-in user, resolved once per request. A lapsed session sends them
 * to /login. Every owner-only page calls `requireOwner()` on top of the
 * sidebar hiding the link — the API enforces it too, this just avoids a
 * page that renders and then fails.
 */
export const getCurrentUser = cache(async (): Promise<UserProfile> => {
  return apiFetch<UserProfile>("/auth/me", { auth: true, redirectOnUnauthorized: true });
});

export async function requireOwner(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (user.role !== "owner") redirect("/pos");
  return user;
}

export function homeFor(role: string): string {
  return role === "owner" ? "/dashboard" : "/pos";
}
