"use client";

import { useActionState, useState } from "react";
import { runBulkPrice, type BulkPriceState } from "@/lib/actions/bulk-price";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, Th, Td } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { Generic, Manufacturer } from "@/types";

const initial: BulkPriceState = { status: "idle" };

export function BulkPriceForm({ manufacturers, generics }: { manufacturers: Manufacturer[]; generics: Generic[] }) {
  const [state, action, pending] = useActionState(runBulkPrice, initial);
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const t = useT();
  const preview = state.preview;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      {state.status === "applied" && state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("th.company")} htmlFor="manufacturer_id">
          <Select id="manufacturer_id" name="manufacturer_id" defaultValue="">
            <option value="">{t("filters.allCompanies")}</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("th.ingredient")} htmlFor="generic_id">
          <Select id="generic_id" name="generic_id" defaultValue="">
            <option value="">{t("filters.allIngredients")}</option>
            {generics.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("bulk.search")} htmlFor="search" hint={t("bulk.searchHint")}>
          <Input id="search" name="search" maxLength={100} autoComplete="off" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("bulk.changeBy")} htmlFor="value">
          <div className="flex gap-2">
            <Select name="mode" value={mode} onChange={(e) => setMode(e.target.value as "percent" | "amount")} aria-label={t("bulk.changeBy")} className="w-24">
              <option value="percent">%</option>
              <option value="amount">৳</option>
            </Select>
            <Input id="value" name="value" inputMode="decimal" placeholder={mode === "percent" ? "5" : "2"} className="tabular-nums" />
          </div>
        </Field>
        <Field label={t("bulk.roundTo")} htmlFor="round_to">
          <Select id="round_to" name="round_to" defaultValue="0.5">
            <option value="0.5">৳0.50</option>
            <option value="1">৳1.00</option>
            <option value="0.01">{t("bulk.noRounding")}</option>
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted">{t("bulk.hint")}</p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intent" value="preview" variant="secondary" disabled={pending}>
          {pending ? t("bulk.working") : t("bulk.preview")}
        </Button>
        {state.status === "preview" && preview && preview.unit_prices > 0 && (
          <Button type="submit" name="intent" value="apply" disabled={pending}>
            {pending ? t("bulk.working") : t("bulk.apply", { variants: preview.variants })}
          </Button>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border border-border">
          <div className="px-5 py-3 text-sm">
            {preview.unit_prices === 0
              ? t("bulk.nothingToChange")
              : t("bulk.previewSummary", { variants: preview.variants, prices: preview.unit_prices })}
          </div>
          {preview.sample.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.medicine")}</Th>
                  <Th>{t("th.unit")}</Th>
                  <Th className="text-right">{t("bulk.now")}</Th>
                  <Th className="text-right">{t("bulk.after")}</Th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((r, i) => (
                  <tr key={`${r.variant_id}-${r.unit}-${i}`}>
                    <Td>{r.name}</Td>
                    <Td className="text-muted">{r.unit}</Td>
                    <Td className="text-right tabular-nums text-muted">{formatCurrency(r.old_price)}</Td>
                    <Td className="text-right font-medium tabular-nums">{formatCurrency(r.new_price)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {preview.unit_prices > preview.sample.length && (
            <p className="px-5 py-2 text-xs text-muted">{t("bulk.moreRows", { count: preview.unit_prices - preview.sample.length })}</p>
          )}
        </div>
      )}
    </form>
  );
}
