"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { ManagedUser } from "@/types";
import { issueText } from "@/lib/messages";
import { getT } from "@/i18n/server";
import type { Translate } from "@/i18n";

export interface UserFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

const passwordSchema = z
  .string()
  .min(8, "v.passwordShort")
  .max(128, "v.passwordLong");

const createSchema = z.object({
  name: z.string().trim().min(1, "v.theirName").max(100, "v.nameLong"),
  email: z.string().trim().email("v.emailInvalid"),
  password: passwordSchema,
  role: z.enum(["owner", "cashier"], { message: "v.pickRole" }),
});

function reasonMessage(error: ApiError, t: Translate): string {
  const reason = (error.body as { reason?: string } | null)?.reason;
  switch (reason) {
    case "email_taken":
      return t("userAction.emailTaken");
    case "self_lockout":
      return t("userAction.selfLockout");
    case "last_owner":
      return t("userAction.lastOwner");
    case "wrong_password":
      return t("userAction.wrongPassword");
    default:
      return error.message;
  }
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const t = await getT();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { status: "error", message: issueText(t, parsed.error.issues[0]?.message) };
  try {
    await apiFetch<ManagedUser>("/users", { method: "POST", auth: true, body: parsed.data });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error, t) };
    throw error;
  }
  revalidatePath("/users");
  return { status: "success", message: t("userAction.created", { name: parsed.data.name, role: t(parsed.data.role === "owner" ? "role.owner" : "role.cashier") }) };
}

export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const id = Number(formData.get("user_id"));
  const intent = String(formData.get("intent") ?? "save");
  const t = await getT();
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: t("action.reload") };

  const body: Record<string, unknown> = {};
  if (intent === "deactivate") body.is_active = false;
  else if (intent === "activate") body.is_active = true;
  else {
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "");
    if (!name) return { status: "error", message: t("v.theirName") };
    if (role !== "owner" && role !== "cashier") return { status: "error", message: t("v.pickRole") };
    body.name = name;
    body.role = role;
  }
  try {
    await apiFetch<ManagedUser>(`/users/${id}`, { method: "PATCH", auth: true, body });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error, t) };
    throw error;
  }
  revalidatePath("/users");
  return {
    status: "success",
    message: intent === "deactivate" ? t("userAction.deactivated") : intent === "activate" ? t("userAction.reactivated") : t("action.saved"),
  };
}

export async function resetUserPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const id = Number(formData.get("user_id"));
  const t = await getT();
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { status: "error", message: issueText(t, parsed.error.issues[0]?.message) };
  try {
    await apiFetch(`/users/${id}/reset-password`, { method: "POST", auth: true, body: { password: parsed.data } });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error, t) };
    throw error;
  }
  return { status: "success", message: t("userAction.passwordSet") };
}

export async function changeOwnPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const current = String(formData.get("current_password") ?? "");
  const next = passwordSchema.safeParse(formData.get("new_password"));
  const confirm = String(formData.get("confirm_password") ?? "");
  const t = await getT();
  if (!current) return { status: "error", message: t("userAction.currentRequired") };
  if (!next.success) return { status: "error", message: issueText(t, next.error.issues[0]?.message) };
  if (next.data !== confirm) return { status: "error", message: t("userAction.mismatch") };
  try {
    await apiFetch("/auth/change-password", {
      method: "POST",
      auth: true,
      body: { current_password: current, new_password: next.data },
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error, t) };
    throw error;
  }
  return { status: "success", message: t("userAction.passwordChanged") };
}
