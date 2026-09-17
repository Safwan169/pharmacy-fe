"use client";

import { useActionState, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { changeOwnPassword, type UserFormState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";

const initial: UserFormState = { status: "idle" };

/** Topbar entry that opens a small dialog for changing your own password. */
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changeOwnPassword, initial);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <KeyRound className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Password</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/30" />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Change your password</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <form action={action} className="mt-4 space-y-3" noValidate>
              {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
              {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
              <Field label="Current password" htmlFor="current_password">
                <Input id="current_password" name="current_password" type="password" autoComplete="current-password" />
              </Field>
              <Field label="New password" htmlFor="new_password" hint="At least 8 characters.">
                <Input id="new_password" name="new_password" type="password" autoComplete="new-password" />
              </Field>
              <Field label="New password again" htmlFor="confirm_password">
                <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" />
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Saving…" : "Change password"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
