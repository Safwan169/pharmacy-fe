"use client";

import { useActionState, useState } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { createUser, resetUserPassword, updateUser, type UserFormState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import type { ManagedUser } from "@/types";
import { useT } from "@/i18n/client";

const initial: UserFormState = { status: "idle" };

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUser, initial);
  const t = useT();
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t("th.name")} htmlFor="new-name" required>
          <Input id="new-name" name="name" maxLength={100} />
        </Field>
        <Field label={t("login.email")} htmlFor="new-email" required hint={t("users.emailHint")}>
          <Input id="new-email" name="email" type="email" autoComplete="off" />
        </Field>
        <Field label={t("login.password")} htmlFor="new-password" required hint={t("password.newHint")}>
          <Input id="new-password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label={t("users.role")} htmlFor="new-role" required>
          <Select id="new-role" name="role" defaultValue="cashier">
            <option value="cashier">{t("users.cashierDesc")}</option>
            <option value="owner">{t("users.ownerDesc")}</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>{pending ? t("payment.adding") : t("users.addButton")}</Button>
    </form>
  );
}

export function UserRowActions({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const [mode, setMode] = useState<"idle" | "edit" | "password">("idle");
  const [editState, editAction, editPending] = useActionState(updateUser, initial);
  const [pwState, pwAction, pwPending] = useActionState(resetUserPassword, initial);
  const t = useT();

  if (mode === "edit") {
    return (
      <form action={editAction} className="mt-2 space-y-2 rounded-lg border border-border bg-background p-3 text-left">
        <input type="hidden" name="user_id" value={user.id} />
        {editState.status === "error" && editState.message && <Alert tone="error">{editState.message}</Alert>}
        {editState.status === "success" && editState.message && <Alert tone="success">{editState.message}</Alert>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="name" defaultValue={user.name ?? ""} placeholder={t("th.name")} maxLength={100} aria-label={t("th.name")} />
          <Select name="role" defaultValue={user.role} aria-label={t("users.role")} disabled={isSelf}>
            <option value="cashier">{t("role.cashier")}</option>
            <option value="owner">{t("role.owner")}</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={editPending}>{t("common.save")}</Button>
          {!isSelf && (
            <Button type="submit" size="sm" variant="secondary" name="intent" value={user.is_active ? "deactivate" : "activate"} disabled={editPending}>
              {user.is_active ? t("users.deactivate") : t("users.reactivate")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>{t("common.close")}</Button>
        </div>
      </form>
    );
  }

  if (mode === "password") {
    return (
      <form action={pwAction} className="mt-2 space-y-2 rounded-lg border border-border bg-background p-3 text-left">
        <input type="hidden" name="user_id" value={user.id} />
        {pwState.status === "error" && pwState.message && <Alert tone="error">{pwState.message}</Alert>}
        {pwState.status === "success" && pwState.message && <Alert tone="success">{pwState.message}</Alert>}
        <Input name="password" type="password" placeholder={t("users.newPasswordPlaceholder")} autoComplete="new-password" aria-label={t("password.new")} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pwPending}>{t("users.setPassword")}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>{t("common.close")}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={() => setMode("edit")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden /> {t("common.edit")}
      </button>
      <button type="button" onClick={() => setMode("password")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <KeyRound className="h-3.5 w-3.5" aria-hidden /> {t("password.button")}
      </button>
    </div>
  );
}
