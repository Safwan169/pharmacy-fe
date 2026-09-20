"use client";

import { useActionState, useMemo, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { updatePricing, type PricingState } from "@/lib/actions/pricing";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn, formatCurrency } from "@/lib/utils";
import type { UnitTemplate, VariantUnit } from "@/types";
import { pluralise } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { Translate } from "@/i18n";

// A "use server" file may only export async functions, so the starting state
// lives here rather than beside the action.
const initialState: PricingState = { status: "idle" };

interface Row {
  key: number;
  name: string;
  qtyInBase: string;
  price: string;
  isSellable: boolean;
  isDefault: boolean;
  /**
   * The counting unit's row. Decided once, when the rows are built — never
   * from the typed size, or typing "10" would lock the row at "1".
   */
  isBase: boolean;
}

/**
 * The unit ladder editor plus the stock count.
 *
 * Units are how the counter sells the medicine — loose tablet, strip, box —
 * each with its own price. Stock is always counted in the smallest unit.
 * Typing one price suggests the others (rounded up to 50 poisha), but every
 * suggestion stays editable because shops price loose tablets above strip ÷ 10.
 */
export function PricingForm({
  variantId,
  baseUnit,
  units,
  template,
  stock,
  reorderLevel,
}: {
  variantId: number;
  baseUnit: string;
  units: VariantUnit[];
  template: UnitTemplate | null;
  stock: number | null;
  reorderLevel: number | null;
}) {
  const [state, formAction, pending] = useActionState(updatePricing, initialState);
  const t = useT();

  const [rows, setRows] = useState<Row[]>(() =>
    units.length > 0
      ? units.map((u, i) => ({
          key: i,
          name: u.name,
          qtyInBase: String(u.qtyInBase),
          price: u.price === null ? "" : String(u.price),
          isSellable: u.isSellable,
          isDefault: u.isDefault,
          isBase: u.qtyInBase === 1,
        }))
      : (template?.units ?? [{ name: baseUnit, qty_in_base: 1, is_sellable: true, is_default: true }]).map(
          (u, i) => ({
            key: i,
            name: u.name,
            qtyInBase: String(u.qty_in_base),
            price: "",
            isSellable: u.is_sellable,
            isDefault: u.is_default,
            isBase: u.qty_in_base === 1,
          }),
        ),
  );
  const [unitsChanged, setUnitsChanged] = useState(units.length === 0);
  const nextKey = useMemo(() => () => Math.max(0, ...rows.map((r) => r.key)) + 1, [rows]);

  const neverPriced = units.length === 0;

  function update(key: number, patch: Partial<Row>) {
    setUnitsChanged(true);
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function setDefault(key: number) {
    setUnitsChanged(true);
    setRows((current) => current.map((r) => ({ ...r, isDefault: r.key === key })));
  }

  function remove(key: number) {
    setUnitsChanged(true);
    setRows((current) => {
      const next = current.filter((r) => r.key !== key);
      if (!next.some((r) => r.isDefault) && next.length > 0) next[0].isDefault = true;
      return next;
    });
  }

  function add() {
    setUnitsChanged(true);
    setRows((current) => [
      ...current,
      { key: nextKey(), name: "", qtyInBase: "", price: "", isSellable: true, isDefault: false, isBase: false },
    ]);
  }

  /** Fill the blank prices from the one just typed, pro rata, rounded up to ৳0.50. */
  function suggestFrom(key: number) {
    const source = rows.find((r) => r.key === key);
    const price = Number(source?.price);
    const qty = Number(source?.qtyInBase);
    if (!source || !(price > 0) || !(qty > 0)) return;
    const perBase = price / qty;
    setUnitsChanged(true);
    setRows((current) =>
      current.map((r) => {
        if (r.key === key || r.price !== "" || !(Number(r.qtyInBase) > 0)) return r;
        const raw = perBase * Number(r.qtyInBase);
        const rounded = Math.ceil(raw * 2) / 2;
        return { ...r, price: rounded.toFixed(2) };
      }),
    );
  }

  const payload = JSON.stringify(
    rows.map((r) => ({
      name: r.name.trim(),
      qty_in_base: Number(r.qtyInBase),
      price: r.price.trim() === "" ? null : Number(r.price),
      is_sellable: r.isSellable,
      is_default: r.isDefault,
    })),
  );

  const stockBreakdown = describeStock(t, stock, baseUnit, rows);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="units" value={payload} />
      <input type="hidden" name="units_changed" value={unitsChanged ? "1" : "0"} />

      {state.status === "success" && state.message && (
        <Alert tone="success">{state.message}</Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert tone="error">{state.message}</Alert>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-foreground">{t("pricing.howSold")}</p>
          <p className="text-xs text-muted">{t("pricing.countedIn", { unit: pluralise(baseUnit, 2) })}</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {neverPriced ? t("pricing.neverPriced") : t("pricing.eachUnit")}
        </p>

        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const isBase = row.isBase;
            return (
              <div
                key={row.key}
                className={cn(
                  "rounded-lg border border-border p-3",
                  row.isDefault && "border-primary/50 bg-primary/5",
                )}
              >
                {isBase && rows.length > 1 ? (
                  // The counting unit is fixed: its name is the base unit and
                  // its size is always 1. Shown as text so it can't be mistaken
                  // for a box that refuses to type.
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Lock className="h-3 w-3" aria-hidden />
                      {t("pricing.baseLocked")}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <Input
                      aria-label={t("pricing.unitName")}
                      value={row.name}
                      placeholder="strip"
                      onChange={(e) => update(row.key, { name: e.target.value })}
                    />
                    <Input
                      aria-label={t("pricing.howMany", { unit: pluralise(baseUnit, 2) })}
                      inputMode="numeric"
                      value={row.qtyInBase}
                      placeholder="10"
                      onChange={(e) => update(row.key, { qtyInBase: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
                      ৳
                    </span>
                    <Input
                      aria-label={t("pricing.pricePer", { unit: row.name || t("th.unit") })}
                      inputMode="decimal"
                      value={row.price}
                      placeholder="0.00"
                      className="pl-7"
                      onChange={(e) => update(row.key, { price: e.target.value })}
                      onBlur={() => suggestFrom(row.key)}
                    />
                  </div>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={row.isSellable}
                      onChange={(e) => update(row.key, { isSellable: e.target.checked })}
                    />
                    {t("pricing.sell")}
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      name="default_unit"
                      checked={row.isDefault}
                      onChange={() => setDefault(row.key)}
                      disabled={!row.isSellable}
                    />
                    {t("pricing.first")}
                  </label>
                  {!(isBase && rows.length > 1) && (
                    <button
                      type="button"
                      onClick={() => remove(row.key)}
                      aria-label={t("pricing.remove", { unit: row.name || t("th.unit") })}
                      className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                {row.price !== "" && Number(row.qtyInBase) > 1 && Number(row.price) > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {formatCurrency(Number(row.price) / Number(row.qtyInBase))} / {baseUnit}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {state.errors?.units && <p className="mt-2 text-xs text-danger">{state.errors.units}</p>}

        {rows.length < 6 && (
          <button
            type="button"
            onClick={add}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("pricing.addUnit")}
          </button>
        )}
      </div>

      <Field
        label={t("pricing.inStock", { unit: capitalise(pluralise(baseUnit, 2)) })}
        htmlFor="stock_quantity"
        error={state.errors?.stock_quantity}
        hint={
          stock === null
            ? t("pricing.notCountedHint", { unit: pluralise(baseUnit, 2) })
            : `${stockBreakdown}. ${t("pricing.countHint")}`
        }
      >
        <Input
          id="stock_quantity"
          name="stock_quantity"
          type="text"
          inputMode="numeric"
          placeholder={stock === null ? "0" : String(stock)}
          autoComplete="off"
          invalid={!!state.errors?.stock_quantity}
        />
      </Field>
      <Field
        label={t("pricing.noteLabel")}
        htmlFor="stock_note"
        hint={t("pricing.noteHint")}
      >
        <Input id="stock_note" name="stock_note" type="text" maxLength={255} autoComplete="off" />
      </Field>

      <Field
        label={t("pricing.reorderLabel")}
        htmlFor="reorder_level"
        error={state.errors?.reorder_level}
        hint={t("pricing.reorderHint", { unit: pluralise(baseUnit, 2) })}
      >
        <input type="hidden" name="reorder_level_was" value={reorderLevel ?? ""} />
        <Input
          id="reorder_level"
          name="reorder_level"
          type="text"
          inputMode="numeric"
          defaultValue={reorderLevel ?? ""}
          placeholder={t("catalogue.reorderDefault")}
          autoComplete="off"
          invalid={!!state.errors?.reorder_level}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("common.saving") : t("common.saveChanges")}
      </Button>

      <p className="text-xs text-muted">
        {t("pricing.restockNote")}
      </p>
    </form>
  );
}

/** "Currently 34 tablets on the shelf — 3 strips + 4 tablets". */
function describeStock(t: Translate, stock: number | null, baseUnit: string, rows: Row[]): string {
  if (stock === null) return "";
  const base = t("pricing.currently", { count: stock.toLocaleString(), unit: pluralise(baseUnit, stock) });
  const pack = rows
    .map((r) => ({ name: r.name, qty: Number(r.qtyInBase) }))
    .filter((r) => r.qty > 1 && r.name)
    .sort((a, b) => a.qty - b.qty)[0];
  if (!pack || stock < pack.qty) return base;
  const whole = Math.floor(stock / pack.qty);
  const loose = stock % pack.qty;
  return `${base} — ${whole} ${pluralise(pack.name, whole)}${loose ? ` + ${loose} ${pluralise(baseUnit, loose)}` : ""}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
