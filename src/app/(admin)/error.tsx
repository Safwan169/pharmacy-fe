"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <TriangleAlert className="h-6 w-6 text-danger" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">This page didn&apos;t load</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        Something went wrong while loading this screen. Nothing you were working
        on has been lost. Try again, and if it keeps happening let your developer
        know.
      </p>
      <Button onClick={reset} className="mt-5">
        Try again
      </Button>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
