"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const next = useSearchParams().get("next");

  return (
    <form action={formAction} className="space-y-5 " noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.message && <Alert tone="error">{state.message}</Alert>}

      <Field label="Email" error={state.errors?.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@pharmacy.com"
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          className="h-11 rounded-xl shadow-xs"
          invalid={!!state.errors?.email}
        />
      </Field>

      <Field label="Password" error={state.errors?.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="h-11 rounded-xl shadow-xs"
          invalid={!!state.errors?.password}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-linear-to-b from-neutral-800 to-neutral-950 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
