"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  loginSchema,
  type LoginFormValues,
  type LoginInput,
} from "@/lib/validations";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginInput) {
    // TODO: replace with the real auth call once the backend exists.
    console.log("login payload", values);
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Email" error={errors.email?.message} htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11 rounded-xl shadow-xs focus:border-neutral-400 focus:outline-neutral-300/50"
          invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field label="Password" error={errors.password?.message} htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-11 rounded-xl shadow-xs focus:border-neutral-400 focus:outline-neutral-300/50"
          invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-linear-to-b from-neutral-800 to-neutral-950 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
