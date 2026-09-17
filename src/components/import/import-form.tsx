"use client";

import { useActionState, useEffect, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { importCatalogue, type ImportState } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

// A "use server" file may only export async functions, so the starting state
// lives here rather than beside the action.
const initialState: ImportState = { status: "idle" };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importCatalogue,
    initialState,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const t = useT();

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && (
        <Alert tone="success" title={t("import.finished")}>
          <p>{state.message}</p>
          {state.result && (
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <Figure label={t("import.medicines")} value={state.result.variantsTotal} />
              <Figure label={t("import.brands")} value={state.result.productsTotal} />
              <Figure label={t("import.companies")} value={state.result.manufacturersTotal} />
              <Figure label={t("import.ingredients")} value={state.result.genericsTotal} />
            </dl>
          )}
          {state.result && state.result.rowsSkipped > 0 && (
            <p className="mt-3">
              {t("import.skipped", { count: state.result.rowsSkipped.toLocaleString() })}
            </p>
          )}
        </Alert>
      )}

      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}

      {pending && <ImportProgress fileName={fileName} />}

      <label
        htmlFor="file"
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-6 py-10 text-center transition-colors",
          pending
            ? "pointer-events-none opacity-50"
            : "cursor-pointer hover:border-primary/50",
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          {fileName ? (
            <FileText className="h-5 w-5" aria-hidden />
          ) : (
            <Upload className="h-5 w-5" aria-hidden />
          )}
        </span>
        <span className="mt-3 text-sm font-medium">
          {fileName ?? t("import.choose")}
        </span>
        <span className="mt-1 text-xs text-muted">
          {fileName ? t("import.pickDifferent") : t("import.browse")}
        </span>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={pending}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      <Button type="submit" disabled={pending || !fileName} className="w-full">
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {t("import.importing")}
          </>
        ) : (
          t("import.start")
        )}
      </Button>
    </form>
  );
}

/**
 * Shown while the upload is in flight.
 *
 * The action reports no percentage, so this is indeterminate on purpose: a
 * moving band plus a running clock, which together answer the only question
 * someone has during a multi-minute wait — "is this still going?"
 */
function ImportProgress({ fileName }: { fileName: string | null }) {
  const [seconds, setSeconds] = useState(0);
  const t = useT();

  useEffect(() => {
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      // A live region would re-announce every tick, so the clock is silent to
      // screen readers and the status below carries the meaning instead.
      role="status"
      aria-label={t("import.progressLabel")}
      className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4"
    >
      <div className="flex items-center gap-3">
        <span className="animate-import-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <FileText className="h-5 w-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2
              className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
              aria-hidden
            />
            <span className="truncate">
              {t("import.importingFile", { file: fileName ?? "" })}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t("import.keepOpen")}
          </p>
        </div>

        <span
          aria-hidden
          className="shrink-0 text-sm font-medium text-muted tabular-nums"
        >
          {formatElapsed(seconds)}
        </span>
      </div>

      {/* Indeterminate track — the band never stops, so a long wait never
          looks like a hang. */}
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
        <span className="animate-import-sweep absolute inset-y-0 w-2/5 rounded-full bg-primary" />
      </div>
    </div>
  );
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
