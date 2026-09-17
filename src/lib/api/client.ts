import "server-only";

import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/session";
import { humaniseApiMessage } from "@/lib/messages";

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/**
 * An error the UI can show as-is. `message` is always a finished sentence in
 * plain English — never a raw validator string like
 * "price must not be greater than 99999999.99".
 */
export class ApiError extends Error {
  readonly status: number;
  /** The untouched body, for callers that need the structured detail (checkout). */
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | undefined | null;

/**
 * Drops empty values so we never send `?search=` and trip the API's strict
 * validation, which rejects unknown and malformed params with a 400.
 *
 * Takes an object type rather than `Record<string, …>` so callers can pass a
 * plain interface — an interface has no implicit index signature and would
 * otherwise be rejected.
 */
export function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, QueryValue][]) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Send the admin JWT. Required by every write and by /sales + /dashboard. */
  auth?: boolean;
  /**
   * When the token is missing or rejected, send the user to /login instead of
   * throwing. Right for page loads; wrong for Server Actions, which should
   * report the problem so the form can show it.
   */
  redirectOnUnauthorized?: boolean;
}

/**
 * The single door to the NestJS API.
 *
 * Runs only on the server, so the JWT never reaches the browser. Catalogue
 * reads are public and skip the token; everything else passes `auth: true`.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    auth = false,
    redirectOnUnauthorized = false,
    body,
    headers,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  let token: string | undefined;

  if (auth) {
    token = await getSessionToken();
    if (!token) {
      if (redirectOnUnauthorized) redirect("/login");
      throw new ApiError(401, "Your session has ended. Please sign in again.", null);
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: requestHeaders,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      // Catalogue and sales data change as the admin works, so a stale page
      // would show prices and stock that no longer hold.
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Check that the API is running and try again.",
      null,
    );
  }

  if (response.status === 401 && redirectOnUnauthorized) {
    redirect("/login");
  }
  if (response.status === 403) {
    throw new ApiError(403, "Only the owner can do this. Ask them to sign in.", await readBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      humaniseApiMessage(response.status, payload),
      payload,
    );
  }

  return payload as T;
}

async function readBody(response: Response): Promise<unknown> {
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => "");
  return text || null;
}

/** Streams a binary response (the invoice PDF) straight through. */
export async function apiFetchBlob(
  path: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = await getSessionToken();
  if (!token) {
    throw new ApiError(401, "Your session has ended. Please sign in again.", null);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      humaniseApiMessage(response.status, await readBody(response)),
      null,
    );
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);

  return {
    blob: await response.blob(),
    filename: match?.[1] ?? "invoice.pdf",
  };
}
