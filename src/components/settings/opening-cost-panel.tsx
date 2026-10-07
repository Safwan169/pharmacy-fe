"use client";

import { useActionState } from "react";
import { costOpeningStock, type OpeningCostState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

const initial: OpeningCostState = { status: "idle" };

/**
 * Stock added through the catalogue has a selling price but no cost, so profit
 * can't be measured. This gives it one, once, at selling price less a percent.
 * Stock received later carries its real cost and is never touched.
 */
export function OpeningCostPanel() {
  const [state, action, pending] = useActionState(costOpeningStock, initial);
  const t = useT();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t("openingCost.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("openingCost.description")}</p>
      </div>

      <form
        action={action}
        onSubmit={(e) => {
          const percent = new FormData(e.currentTarget).get("percent");
          if (!window.confirm(t("openingCost.confirm", { percent: String(percent) }))) e.preventDefault();
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

      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
    </div>
  );
}
