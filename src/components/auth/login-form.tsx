"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useT } from "@/i18n/client";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const next = useSearchParams().get("next");
  const t = useT();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.message && <Alert tone="error">{state.message}</Alert>}

      <Field label={t("login.email")} error={state.errors?.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@pharmacy.com"
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          className="h-12 rounded-xl shadow-xs"
          invalid={!!state.errors?.email}
        />
      </Field>

      <Field label={t("login.password")} error={state.errors?.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={t("login.passwordPlaceholder")}
          className="h-12 rounded-xl shadow-xs"
          invalid={!!state.errors?.password}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-white shadow-md transition-[transform,opacity] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? t("login.submitting") : t("login.submit")}
        {!pending && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        )}
      </button>
    </form>
  );
}
