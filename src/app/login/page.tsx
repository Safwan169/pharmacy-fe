import { Suspense } from "react";
import { Cross } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-5 py-16 sm:py-16">
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

      <div className="relative w-full max-w-sm px-4">
        <div className="mb-2 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
            <Cross className="h-5 w-5 text-surface" aria-hidden />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Pharmacy</span>
        </div>
        <p className="mb-8 text-center text-sm text-muted">
          Sign in to manage the catalogue and the counter.
        </p>

        {/* useSearchParams needs a boundary; the form is the only dynamic part. */}
        <Suspense fallback={<div className="h-72" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
