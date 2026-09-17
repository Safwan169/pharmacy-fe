"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { ManagedUser } from "@/types";

export interface UserFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for the password.")
  .max(128, "That password is too long.");

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(100),
  email: z.string().trim().email("That doesn't look like an email address."),
  password: passwordSchema,
  role: z.enum(["owner", "cashier"], { message: "Pick owner or cashier." }),
});

function reasonMessage(error: ApiError): string {
  const reason = (error.body as { reason?: string } | null)?.reason;
  switch (reason) {
    case "email_taken":
      return "Someone already logs in with that email.";
    case "self_lockout":
      return "You can't lock yourself out. Ask another owner to do this.";
    case "last_owner":
      return "The shop needs at least one active owner.";
    case "wrong_password":
      return "The current password is wrong.";
    default:
      return error.message;
  }
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    await apiFetch<ManagedUser>("/users", { method: "POST", auth: true, body: parsed.data });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
  revalidatePath("/users");
  return { status: "success", message: `${parsed.data.name} can now sign in as ${parsed.data.role}.` };
}

export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const id = Number(formData.get("user_id"));
  const intent = String(formData.get("intent") ?? "save");
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Reload the page and try again." };

  const body: Record<string, unknown> = {};
  if (intent === "deactivate") body.is_active = false;
  else if (intent === "activate") body.is_active = true;
  else {
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "");
    if (!name) return { status: "error", message: "Enter their name." };
    if (role !== "owner" && role !== "cashier") return { status: "error", message: "Pick owner or cashier." };
    body.name = name;
    body.role = role;
  }
  try {
    await apiFetch<ManagedUser>(`/users/${id}`, { method: "PATCH", auth: true, body });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
  revalidatePath("/users");
  return {
    status: "success",
    message: intent === "deactivate" ? "Deactivated. They can no longer sign in." : intent === "activate" ? "They can sign in again." : "Saved.",
  };
}

export async function resetUserPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const id = Number(formData.get("user_id"));
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    await apiFetch(`/users/${id}/reset-password`, { method: "POST", auth: true, body: { password: parsed.data } });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
  return { status: "success", message: "Password set. Tell them the new one in person." };
}

export async function changeOwnPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const current = String(formData.get("current_password") ?? "");
  const next = passwordSchema.safeParse(formData.get("new_password"));
  const confirm = String(formData.get("confirm_password") ?? "");
  if (!current) return { status: "error", message: "Enter your current password." };
  if (!next.success) return { status: "error", message: next.error.issues[0]?.message };
  if (next.data !== confirm) return { status: "error", message: "The two new passwords don't match." };
  try {
    await apiFetch("/auth/change-password", {
      method: "POST",
      auth: true,
      body: { current_password: current, new_password: next.data },
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
  return { status: "success", message: "Password changed." };
}
