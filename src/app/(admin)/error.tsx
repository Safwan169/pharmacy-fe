"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * The last line of defence. Whatever actually broke, the person reading this
 * needs one clear next step — not a stack trace.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <TriangleAlert className="h-6 w-6 text-danger" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">{t("error.title")}</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        {t("error.body")}
      </p>
      <Button onClick={reset} className="mt-5">
        {t("error.retry")}
      </Button>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted">
          {t("error.reference")}: {error.digest}
        </p>
      )}
    </div>
  );
}
