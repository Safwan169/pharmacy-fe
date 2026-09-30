"use client";

import { useActionState } from "react";
import { CircleCheck, Wallet } from "lucide-react";
import { closeDay, type CloseDayState } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { DayClosingSummary } from "@/types";
import { useT } from "@/i18n/client";

const initial: CloseDayState = { status: "idle" };

/**
 * The one number that keeps the drawer honest.
 *
 * Nobody is going to keep an expense book, so cash leaves for lunch and a
 * rickshaw without a trace and the expected figure drifts further from the
 * drawer every day. Counting once a night settles it: tomorrow opens from
 * what was counted, and the shortfall is a fact about today rather than a
 * number that has been growing since the shop opened.
 */
export function DayCloseForm({
  date,
  expected,
  closing,
}: {
  date: string;
  expected: number;
  closing: DayClosingSummary | null;
}) {
  const [state, action, busy] = useActionState(closeDay, initial);
  const t = useT();

  // Truthiness, not a null check: an API that predates the closings table
  // sends no field at all, and treating that as "already closed" would render
  // a summary of nothing.
  if (closing && state.status !== "error") {
    return <ClosedSummary closing={closing} />;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="date" value={date} />

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{t("closeDay.expected")}</span>
        <span className="text-base font-semibold tabular-nums">{formatCurrency(expected)}</span>
      </div>

      <Field label={t("closeDay.counted")} htmlFor="counted_cash" hint={t("closeDay.countedHint")} required>
        <Input
          id="counted_cash"
          name="counted_cash"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          required
        />
      </Field>

      <Field label={t("closeDay.note")} htmlFor="note" hint={t("closeDay.noteHint")}>
        <Input id="note" name="note" maxLength={255} autoComplete="off" placeholder={t("closeDay.notePlaceholder")} />
      </Field>

      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

      <Button type="submit" disabled={busy} className="w-full">
        <Wallet className="h-4 w-4" aria-hidden />
        {busy ? t("closeDay.saving") : t("closeDay.submit")}
      </Button>
    </form>
  );
}

/** What was found, and how far it was from what was expected. */
function ClosedSummary({ closing }: { closing: DayClosingSummary }) {
  const t = useT();
  const short = closing.difference < 0;
  const even = closing.difference === 0;

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-success">
        <CircleCheck className="h-4 w-4" aria-hidden />
        {t("closeDay.done")}
      </p>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t("closeDay.expected")}</dt>
          <dd className="tabular-nums">{formatCurrency(closing.expected_cash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t("closeDay.counted")}</dt>
          <dd className="tabular-nums">{formatCurrency(closing.counted_cash)}</dd>
        </div>
        <div
          className={`flex justify-between border-t border-border pt-2 text-base font-semibold ${
            even ? "" : short ? "text-warning" : "text-success"
          }`}
        >
          <dt>{even ? t("closeDay.matched") : short ? t("closeDay.short") : t("closeDay.over")}</dt>
          <dd className="tabular-nums">{formatCurrency(Math.abs(closing.difference))}</dd>
        </div>
      </dl>

      {closing.note && <p className="text-sm text-foreground/80">{closing.note}</p>}

      <p className="text-xs text-muted">
        {t("closeDay.by", { name: closing.closed_by, when: formatDateTime(closing.closed_at) })}
      </p>
      <p className="text-xs text-muted">{t("closeDay.carriesOver")}</p>
    </div>
  );
}
