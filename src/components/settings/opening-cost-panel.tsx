"use client";

import { useActionState, useEffect, useTransition } from "react";
import { costOpeningStock, type OpeningCostState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { popupConfirm, popupError, popupSuccess } from "@/lib/popup";

const initial: OpeningCostState = { status: "idle" };

/**
 * Stock added through the catalogue has a selling price but no cost, so profit
 * can't be measured. This gives it one, once, at selling price less a percent.
 * Stock received later carries its real cost and is never touched.
 */
export function OpeningCostPanel() {
  const [state, action, pending] = useActionState(costOpeningStock, initial);
  const [, startTransition] = useTransition();
  const t = useT();

  useEffect(() => {
    if (!state.message) return;
    if (state.status === "success") void popupSuccess(state.message, t("common.ok"));
    if (state.status === "error") void popupError(state.message, t("common.ok"));
  }, [state, t]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t("openingCost.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("openingCost.description")}</p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const ok = await popupConfirm(
            t("openingCost.confirm", { percent: String(data.get("percent")) }),
            t("openingCost.apply"),
            t("common.cancel"),
          );
          if (ok) startTransition(() => action(data));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field label={t("openingCost.percent")} htmlFor="opening_cost_percent">
          <Input id="opening_cost_percent" name="percent" inputMode="decimal" defaultValue="16" className="w-28" autoComplete="off" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("openingCost.apply")}
        </Button>
      </form>
    </div>
  );
}
