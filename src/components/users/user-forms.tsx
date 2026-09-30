"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { KeyRound, Pencil, UserPlus, X } from "lucide-react";
import { createUser, resetUserPassword, updateUser, type UserFormState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import type { ManagedUser } from "@/types";
import { useT } from "@/i18n/client";

const initial: UserFormState = { status: "idle" };

/** Escape closes whichever of these is open. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/**
 * A form on a sheet of its own.
 *
 * Adding a user was a card above the table that every visit to this page had
 * to scroll past, and editing one opened inside the row's last cell — about a
 * hundred pixels wide on a phone, which stacked four labelled boxes into a
 * ribbon down the side of the table.
 */
function UserDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT();
  useEscape(onClose);

  return (
    <ModalShell label={title} onDismiss={onClose}>
      <Card className="w-full max-w-lg">
        <CardHeader
          title={title}
          action={
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        />
        <CardBody>{children}</CardBody>
      </Card>
    </ModalShell>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createUser, initial);
  const t = useT();
  const saved = state.status === "success";

  return (
    <form action={action} className="space-y-3" noValidate>
      {saved && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      {/* Staff are hired in twos, and an added user's details left in the
          boxes are the next one's mistake waiting to happen. Remounting the
          fields is what empties them — they are uncontrolled, so an action
          result does not touch them. */}
      <div key={saved ? `saved-${state.message ?? ""}` : "typing"} className="grid gap-3 sm:grid-cols-2">
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
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? t("payment.adding") : t("users.addButton")}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>{t("common.close")}</Button>
      </div>
    </form>
  );
}

/** The page's own "add a user" button. */
export function AddUserButton() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden />
        {t("users.addButton")}
      </Button>
      {open && (
        <UserDialog title={t("users.add")} onClose={() => setOpen(false)}>
          <AddUserForm onDone={() => setOpen(false)} />
        </UserDialog>
      )}
    </>
  );
}

export function UserRowActions({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const [mode, setMode] = useState<"idle" | "edit" | "password">("idle");
  const [editState, editAction, editPending] = useActionState(updateUser, initial);
  const [pwState, pwAction, pwPending] = useActionState(resetUserPassword, initial);
  const t = useT();
  const close = () => setMode("idle");
  const who = user.name?.trim() || user.email;

  return (
    <>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setMode("edit")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> {t("common.edit")}
        </button>
        <button type="button" onClick={() => setMode("password")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> {t("password.button")}
        </button>
      </div>

      {mode === "edit" && (
        <UserDialog title={who} onClose={close}>
          <form action={editAction} className="space-y-3">
            <input type="hidden" name="user_id" value={user.id} />
            {editState.status === "error" && editState.message && <Alert tone="error">{editState.message}</Alert>}
            {editState.status === "success" && editState.message && <Alert tone="success">{editState.message}</Alert>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("th.name")} htmlFor={`name-${user.id}`}>
                <Input id={`name-${user.id}`} name="name" defaultValue={user.name ?? ""} maxLength={100} />
              </Field>
              <Field label={t("users.role")} htmlFor={`role-${user.id}`}>
                <Select id={`role-${user.id}`} name="role" defaultValue={user.role} disabled={isSelf}>
                  <option value="cashier">{t("role.cashier")}</option>
                  <option value="owner">{t("role.owner")}</option>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={editPending}>{t("common.save")}</Button>
              {!isSelf && (
                <Button type="submit" size="sm" variant="secondary" name="intent" value={user.is_active ? "deactivate" : "activate"} disabled={editPending}>
                  {user.is_active ? t("users.deactivate") : t("users.reactivate")}
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={close}>{t("common.close")}</Button>
            </div>
          </form>
        </UserDialog>
      )}

      {mode === "password" && (
        <UserDialog title={t("password.button")} onClose={close}>
          <form action={pwAction} className="space-y-3">
            <input type="hidden" name="user_id" value={user.id} />
            {pwState.status === "error" && pwState.message && <Alert tone="error">{pwState.message}</Alert>}
            {pwState.status === "success" && pwState.message && <Alert tone="success">{pwState.message}</Alert>}
            <Field label={t("password.new")} htmlFor={`pw-${user.id}`} hint={t("password.newHint")} required>
              <Input id={`pw-${user.id}`} name="password" type="password" placeholder={t("users.newPasswordPlaceholder")} autoComplete="new-password" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pwPending}>{t("users.setPassword")}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={close}>{t("common.close")}</Button>
            </div>
          </form>
        </UserDialog>
      )}
    </>
  );
}
