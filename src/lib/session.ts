import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "pharmacy_session";

/**
 * The JWT lives in an httpOnly cookie, so no script on the page can read it —
 * only the Next.js server attaches it to API calls. The lifetime here is the
 * cookie's, not the token's: an expired token still gets a 401 from the API,
 * which `apiFetch` turns into a redirect to /login.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day, matching the API's default JWT_EXPIRES_IN
const SECURE_COOKIE = process.env.SESSION_COOKIE_SECURE === "true";

export async function createSession(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
