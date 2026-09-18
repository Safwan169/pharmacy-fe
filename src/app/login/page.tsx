import { Suspense } from "react";
import { ArrowUpRight, Pill, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getT } from "@/i18n/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const t = await getT();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-5 py-12 sm:py-16">
      {/* Dashed lines boxing in the card, as in the reference layout. */}
      <div
        aria-hidden
        className="grid-frame pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="hidden md:block grid-line grid-line-v grid-line-left" />
        <div className="hidden md:block grid-line grid-line-v grid-line-right grid-line-strong" />
        <div className="hidden md:block grid-line grid-line-h grid-line-top grid-line-strong" />
        <div className="hidden md:block grid-line grid-line-h grid-line-bottom grid-line-strong" />
      </div>

      <main className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="h-4 w-4" aria-hidden />
            </span>
            {t("login.brand")}
          </span>
          <span className="flex items-center gap-1.5 normal-case tracking-normal">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            {t("login.secure")}
          </span>
        </div>

        <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[0_24px_70px_-32px_rgba(16,24,40,0.38)] sm:p-8">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("login.portal")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {t("login.welcome")}
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
              {t("login.lead")}
            </p>
          </div>

          <Suspense fallback={<div className="h-72" />}>
            <LoginForm
              defaultEmail={process.env.DEFAULT_LOGIN_EMAIL ?? ""}
              defaultPassword={process.env.DEFAULT_LOGIN_PASSWORD ?? ""}
            />
          </Suspense>
        </section>

        <p className="mt-5 flex items-center justify-center gap-1 text-center text-xs text-muted">
          {t("login.help")}
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
            {t("login.contact")} <ArrowUpRight className="h-3 w-3" aria-hidden />
          </span>
        </p>
      </main>
    </div>
  );
}
