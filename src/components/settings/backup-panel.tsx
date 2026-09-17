"use client";

import { useActionState } from "react";
import { DatabaseBackup } from "lucide-react";
import { runBackup, type BackupState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import type { BackupFile } from "@/types";
import { useT } from "@/i18n/client";

const initial: BackupState = { status: "idle" };

export function BackupPanel({ backups }: { backups: { dir: string; files: BackupFile[] } | null }) {
  const [state, action, pending] = useActionState(runBackup, initial);
  const t = useT();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("backup.title")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("backup.description")}
          </p>
          {backups && <p className="mt-1 text-xs text-muted">{t("backup.savedIn", { dir: backups.dir })}</p>}
        </div>
        <form action={action}>
          <Button type="submit" disabled={pending}>
            <DatabaseBackup className="h-4 w-4" aria-hidden />
            {pending ? t("backup.running") : t("backup.now")}
          </Button>
        </form>
      </div>

      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

      {backups === null ? (
        <p className="text-sm text-muted">{t("backup.unreadable")}</p>
      ) : backups.files.length === 0 ? (
        <p className="text-sm text-warning">{t("backup.none")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {backups.files.slice(0, 10).map((f) => (
            <li key={f.name} className="flex items-center justify-between px-3 py-2">
              <span className="font-mono text-xs">{f.name}</span>
              <span className="text-xs text-muted">
                {(f.size_bytes / 1024).toFixed(0)} KB · {formatDateTime(f.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        {t("backup.restoreHint")} <code className="font-mono">npm run restore -- &lt;file&gt;</code>
      </p>
    </div>
  );
}
