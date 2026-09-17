"use client";

import { useActionState, useState } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { createUser, resetUserPassword, updateUser, type UserFormState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import type { ManagedUser } from "@/types";

const initial: UserFormState = { status: "idle" };

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUser, initial);
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name" htmlFor="new-name" required>
          <Input id="new-name" name="name" maxLength={100} />
        </Field>
        <Field label="Email" htmlFor="new-email" required hint="They sign in with this.">
          <Input id="new-email" name="email" type="email" autoComplete="off" />
        </Field>
        <Field label="Password" htmlFor="new-password" required hint="At least 8 characters.">
          <Input id="new-password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Role" htmlFor="new-role" required>
          <Select id="new-role" name="role" defaultValue="cashier">
            <option value="cashier">Cashier — sells and takes returns</option>
            <option value="owner">Owner — everything</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add user"}</Button>
    </form>
  );
}

export function UserRowActions({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const [mode, setMode] = useState<"idle" | "edit" | "password">("idle");
  const [editState, editAction, editPending] = useActionState(updateUser, initial);
  const [pwState, pwAction, pwPending] = useActionState(resetUserPassword, initial);

  if (mode === "edit") {
    return (
      <form action={editAction} className="mt-2 space-y-2 rounded-lg border border-border bg-background p-3 text-left">
        <input type="hidden" name="user_id" value={user.id} />
        {editState.status === "error" && editState.message && <Alert tone="error">{editState.message}</Alert>}
        {editState.status === "success" && editState.message && <Alert tone="success">{editState.message}</Alert>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="name" defaultValue={user.name ?? ""} placeholder="Name" maxLength={100} aria-label="Name" />
          <Select name="role" defaultValue={user.role} aria-label="Role" disabled={isSelf}>
            <option value="cashier">Cashier</option>
            <option value="owner">Owner</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={editPending}>Save</Button>
          {!isSelf && (
            <Button type="submit" size="sm" variant="secondary" name="intent" value={user.is_active ? "deactivate" : "activate"} disabled={editPending}>
              {user.is_active ? "Deactivate" : "Reactivate"}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>Close</Button>
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
        <Input name="password" type="password" placeholder="New password (8+ characters)" autoComplete="new-password" aria-label="New password" />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pwPending}>Set password</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>Close</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={() => setMode("edit")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
      </button>
      <button type="button" onClick={() => setMode("password")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <KeyRound className="h-3.5 w-3.5" aria-hidden /> Password
      </button>
    </div>
  );
}
