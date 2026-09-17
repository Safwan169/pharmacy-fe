"use client";

import { useActionState } from "react";
import { DatabaseBackup } from "lucide-react";
import { runBackup, type BackupState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import type { BackupFile } from "@/types";

const initial: BackupState = { status: "idle" };

export function BackupPanel({ backups }: { backups: { dir: string; files: BackupFile[] } | null }) {
  const [state, action, pending] = useActionState(runBackup, initial);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Backups</h2>
          <p className="mt-1 text-sm text-muted">
            A copy of the whole database — every sale, invoice, batch and customer. Take one at the end of each day, and
            copy the newest file somewhere off this computer now and then.
          </p>
          {backups && <p className="mt-1 text-xs text-muted">Saved in {backups.dir}</p>}
        </div>
        <form action={action}>
          <Button type="submit" disabled={pending}>
            <DatabaseBackup className="h-4 w-4" aria-hidden />
            {pending ? "Backing up…" : "Back up now"}
          </Button>
        </form>
      </div>

      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

      {backups === null ? (
        <p className="text-sm text-muted">Couldn&apos;t read the backup folder.</p>
      ) : backups.files.length === 0 ? (
        <p className="text-sm text-warning">No backups yet. Take the first one now.</p>
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
        To restore: stop the API, then run <code className="font-mono">npm run restore -- &lt;file&gt;</code> in the backend folder.
      </p>
    </div>
  );
}
