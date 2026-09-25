"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CircleCheck, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import {
  quickAddSupplier,
  receiveStock,
  searchForReceive,
  searchSuppliers,
  type ReceiveResult,
  type ReceiveSearchResult,
} from "@/lib/actions/stock";
import { cn, formatCurrency, todayInDhaka } from "@/lib/utils";
import type { StockReceipt, Supplier } from "@/types";
import { useT } from "@/i18n/client";

interface Line {
  key: number;
  variantId: number;
  name: string;
  dosageForm: string;
  baseUnit: string;
  units: { id: number; name: string; qtyInBase: number; price: number | null; isSellable: boolean }[];
  /** MRP printed on the pack, per base unit, and for a full pack. */
  mrp: number | null;
  packMrp: number | null;
  packSize: number | null;
  /** Sellable base units already on the shelf when the line was added. */
  stockBefore: number;
  unitId: number | "";
  quantity: string;
  unitCost: string;
  batchNo: string;
  expiryMonth: string; // YYYY-MM
  /** What the medicine will be sold as: unit name, size, price. */
  sellRows: SellRow[];
  /** True when the packs in this delivery carry a revised printed MRP. */
  mrpRevised: boolean;
  priceWhen: "now" | "after_old_stock";
  pricesOpen: boolean;
}

interface SellRow {
  name: string;
  qtyInBase: number;
  /** Today's price for this unit, null when the unit doesn't exist yet. */
  current: number | null;
  /** As typed. "" = leave this unit alone. */
  price: string;
  /** True once the shop typed this one, so it stops following the others. */
  manual?: boolean;
}

/**
 * One price typed by hand sets the rate for the whole ladder: a tablet at ৳1.20
 * makes a strip of ten ৳12. Rows the shop has typed itself are left alone.
 */
function propagate(rows: SellRow[], fromIndex: number): SellRow[] {
  const source = rows[fromIndex];
  if (source.price === "") return rows;
  const perBase = Number(source.price) / source.qtyInBase;
  if (!Number.isFinite(perBase) || perBase <= 0) return rows;
  return rows.map((r, i) =>
    i === fromIndex || r.manual ? r : { ...r, price: money(perBase * r.qtyInBase) },
  );
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * What to sell each unit at, before the shop overrides it. The MRP printed on
 * the pack comes first — that is what a pharmacy charges — with cost plus the
 * shop's usual margin only as a fallback for medicines with no printed price.
 */
function suggestedPrice(
  row: { qtyInBase: number; current: number | null },
  mrp: number | null,
  costPerBase: number,
  markupPercent: number | null,
): string {
  if (row.current !== null) return money(row.current);
  if (mrp !== null) return money(mrp * row.qtyInBase);
  if (markupPercent !== null && costPerBase > 0) {
    return money(costPerBase * (1 + markupPercent / 100) * row.qtyInBase);
  }
  return "";
}

/** The ladder to offer: what the medicine already sells as, else the template. */
function buildSellRows(item: ReceiveSearchResult): SellRow[] {
  const existing = item.units.filter((u) => u.isSellable);
  if (existing.length > 0) {
    return existing
      .map((u) => ({ name: u.name, qtyInBase: u.qtyInBase, current: u.price, price: u.price === null ? "" : money(u.price) }))
      .sort((a, b) => a.qtyInBase - b.qtyInBase);
  }
  return item.suggestedUnits
    .map((u) => ({ name: u.name, qtyInBase: u.qtyInBase, current: null, price: "" }))
    .sort((a, b) => a.qtyInBase - b.qtyInBase);
}

/** Last day of a YYYY-MM month as YYYY-MM-DD — packs print month/year. */
function endOfMonth(ym: string): string | undefined {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return undefined;
  const last = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  return `${m[1]}-${m[2]}-${String(last).padStart(2, "0")}`;
}

/**
 * Receiving a delivery. One header (who, their invoice no, date) and any
 * number of lines, each of which becomes a batch with its own expiry and cost.
 * Counts are in whatever unit the supplier delivers in — box, strip, bottle —
 * and converted to base units by the API.
 */
export function ReceiveForm({ initialSupplierId, markupPercent }: { initialSupplierId?: number; markupPercent: number | null }) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayInDhaka());
  const [note, setNote] = useState("");
  // "full" = paid at the door, "credit" = all on the supplier's account,
  // "partial" = some now, rest on account.
  const [payMode, setPayMode] = useState<"full" | "credit" | "partial">("full");
  const [paidNow, setPaidNow] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bkash">("cash");
  const [lines, setLines] = useState<Line[]>([]);
  const [result, setResult] = useState<ReceiveResult | null>(null);
  const [saved, setSaved] = useState<StockReceipt | null>(null);
  const [savedPrices, setSavedPrices] = useState({ now: 0, later: 0 });
  const [submitting, startSubmit] = useTransition();
  const keyRef = useRef(0);
  const t = useT();

  function addLine(item: ReceiveSearchResult) {
    const biggest = [...item.units].sort((a, b) => b.qtyInBase - a.qtyInBase)[0];
    setLines((current) => [
      ...current,
      {
        key: ++keyRef.current,
        variantId: item.id,
        name: item.name,
        dosageForm: item.dosageForm,
        baseUnit: item.baseUnit,
        units: item.units,
        mrp: item.mrp,
        packMrp: item.packMrp,
        packSize: item.packSize,
        stockBefore: item.stock ?? 0,
        unitId: biggest ? biggest.id : "",
        quantity: "",
        unitCost: "",
        batchNo: "",
        expiryMonth: "",
        sellRows: buildSellRows(item).map((r) => ({
          ...r,
          price: suggestedPrice(r, item.mrp, 0, null),
        })),
        // Something already on the shelf and already priced: default to letting
        // it sell out at the old price. Otherwise the new price is simply the price.
        mrpRevised: false,
        priceWhen: (item.stock ?? 0) > 0 && item.units.some((u) => u.price !== null) ? "after_old_stock" : "now",
        // Open straight away when nothing is priced yet — it can't be sold otherwise.
        pricesOpen: !item.units.some((u) => u.isSellable && u.price !== null),
      },
    ]);
    setResult(null);
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setResult(null);
  }

  function remove(key: number) {
    setLines((current) => current.filter((l) => l.key !== key));
    setResult(null);
  }

  const lineErrors = lines.map((l) => {
    const qty = Number(l.quantity);
    const cost = Number(l.unitCost);
    if (!l.quantity || !Number.isInteger(qty) || qty < 1) return t("receive.errQty");
    if (l.unitCost === "" || Number.isNaN(cost) || cost < 0) return t("receive.errCost");
    if (l.expiryMonth && !endOfMonth(l.expiryMonth)) return t("receive.errExpiry");
    for (const row of l.sellRows) {
      if (row.price === "") continue;
      const p = Number(row.price);
      if (!Number.isFinite(p) || p < 0) return t("receive.errSellPrice", { unit: row.name });
    }
    if (l.sellRows.every((r) => r.price === "" && r.current === null)) return t("receive.errNoPrice");
    return undefined;
  });
  const hasErrors = lineErrors.some(Boolean);

  const total = lines.reduce((sum, l) => {
    const qty = Number(l.quantity);
    const cost = Number(l.unitCost);
    return sum + (qty > 0 && cost >= 0 ? qty * cost : 0);
  }, 0);

  const paidAmount = payMode === "full" ? total : payMode === "credit" ? 0 : Number(paidNow) || 0;
  const onAccount = Math.max(0, total - paidAmount);
  const paymentError =
    payMode !== "full" && onAccount > 0 && !supplier
      ? t("receive.supplierRequired")
      : payMode === "partial" && paidAmount > total
        ? t("receive.paidTooMuch")
        : undefined;

  const problemIndexes = new Set(
    result?.status === "rejected" ? result.problems.map((p) => p.index) : [],
  );
  const problemByIndex = new Map(
    result?.status === "rejected" ? result.problems.map((p) => [p.index, p.message]) : [],
  );

  /** Only prices that were typed and actually differ from today's go out. */
  function sellPricePayload(l: Line) {
    const changed = l.sellRows
      .filter((r) => r.price !== "" && Number(r.price) !== r.current)
      .map((r) => ({ unit_name: r.name, qty_in_base: r.qtyInBase, price: Number(r.price) }));
    const newMrp = l.mrpRevised ? basePrice(l) : undefined;
    if (changed.length === 0) return newMrp === undefined ? {} : { new_mrp: newMrp };
    return { sell_prices: changed, price_when: l.priceWhen, ...(newMrp === undefined ? {} : { new_mrp: newMrp }) };
  }
  /** The typed price of one base unit — which is what an MRP is quoted in. */
  function basePrice(l: Line): number | undefined {
    const base = l.sellRows.find((r) => r.qtyInBase === 1 && r.price !== "");
    if (base) return Number(base.price);
    const any = l.sellRows.find((r) => r.price !== "");
    return any ? Math.round((Number(any.price) / any.qtyInBase) * 100) / 100 : undefined;
  }

  const priceSummary = lines.reduce(
    (acc, l) => {
      const p = sellPricePayload(l);
      if ("sell_prices" in p) acc[l.priceWhen === "now" || l.stockBefore === 0 ? "now" : "later"] += 1;
      return acc;
    },
    { now: 0, later: 0 },
  );

  /** Re-fills the prices from the MRP, or from cost plus the shop's margin. */
  function fillSuggestions(key: number, source: "mrp" | "markup") {
    setLines((current) =>
      current.map((l) => {
        if (l.key !== key) return l;
        const unit = l.units.find((u) => u.id === l.unitId);
        const costPerBase = Number(l.unitCost) / (unit?.qtyInBase ?? 1);
        return {
          ...l,
          sellRows: l.sellRows.map((r) => ({
            ...r,
            manual: false,
            price:
              source === "mrp"
                ? l.mrp === null
                  ? r.price
                  : money(l.mrp * r.qtyInBase)
                : markupPercent === null || !(costPerBase > 0)
                  ? r.price
                  : money(costPerBase * (1 + markupPercent / 100) * r.qtyInBase),
          })),
        };
      }),
    );
  }

  function submit() {
    if (lines.length === 0 || hasErrors || paymentError) return;
    startSubmit(async () => {
      const response = await receiveStock({
        supplier_id: supplier?.id,
        supplier_invoice_no: invoiceNo.trim() || undefined,
        received_at: receivedAt || undefined,
        note: note.trim() || undefined,
        paid_amount: payMode === "full" ? Math.round(total * 100) / 100 : payMode === "credit" ? 0 : Number(paidNow) || 0,
        paid_method: payMethod,
        items: lines.map((l) => ({
          variant_id: l.variantId,
          unit_id: l.unitId === "" ? undefined : l.unitId,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost),
          batch_no: l.batchNo.trim() || undefined,
          expiry_date: endOfMonth(l.expiryMonth),
          ...sellPricePayload(l),
        })),
      });
      setResult(response);
      if (response.status === "success") {
        setSavedPrices(priceSummary);
        setSaved(response.receipt);
        // The supplier and the date usually carry over to the next delivery;
        // the lines and the invoice number never do.
        setLines([]);
        setInvoiceNo("");
        setNote("");
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {saved && (
        <ReceivedDialog receipt={saved} prices={savedPrices} onClose={() => setSaved(null)} />
      )}
      <div className="space-y-5 lg:col-span-3">
        <Card>
          <CardHeader title={t("receive.delivery")} description={t("receive.deliveryHint")} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SupplierPicker value={supplier} onChange={setSupplier} initialId={initialSupplierId} />
            </div>
            <Field label={t("receive.invoiceNo")} htmlFor="invoice_no" hint={t("receive.invoiceNoHint")}>
              <Input id="invoice_no" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} maxLength={50} />
            </Field>
            <Field label={t("receive.dateReceived")} htmlFor="received_at">
              <Input id="received_at" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("deliveries.note")} htmlFor="note" hint={`${t("common.optional")}.`}>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <ItemSearch onSelect={addLine} />
      </div>

      <div className="lg:sticky lg:top-2 lg:col-span-2 lg:self-start">
        <Card className="max-h-[calc(100vh-6rem)] overflow-y-auto">
          <CardHeader
            title={t("receive.lines")}
            description={lines.length === 0 ? t("pos.nothingAdded") : t(lines.length === 1 ? "receive.lineCount" : "receive.linesCount", { count: lines.length })}
          />

          {result?.status === "rejected" && (
            <div className="px-5 pt-5">
              <Alert tone="error" title={t("receive.notSaved")}>
                {t("receive.notSavedHint")}
              </Alert>
            </div>
          )}
          {result?.status === "error" && (
            <div className="px-5 pt-5">
              <Alert tone="error">{result.message}</Alert>
            </div>
          )}

          {lines.length === 0 ? (
            <p className="p-5 text-sm text-muted">
              {t("receive.emptyLines")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line, index) => {
                const unit = line.units.find((u) => u.id === line.unitId);
                const qtyInBase = unit?.qtyInBase ?? 1;
                const unitName = unit?.name ?? line.baseUnit;
                const qty = Number(line.quantity);
                const cost = Number(line.unitCost);
                // Don't nag about a line the user hasn't started filling in yet.
                const started = line.quantity !== "" || line.unitCost !== "" || line.batchNo !== "" || line.expiryMonth !== "";
                return (
                  <li key={line.key} className={cn("space-y-2 px-5 py-3", problemIndexes.has(index) && "bg-danger/5")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.name}</p>
                        <p className="text-xs text-muted">{line.dosageForm}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        aria-label={t("pricing.remove", { unit: line.name })}
                        className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="block text-[11px] text-muted">
                        {t("receive.unitIn")}
                      <Select
                        className="mt-0.5"
                        value={line.unitId}
                        onChange={(e) => update(line.key, { unitId: e.target.value === "" ? "" : Number(e.target.value) })}
                      >
                        <option value="">{line.baseUnit}</option>
                        {line.units
                          .filter((u) => u.qtyInBase > 1)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} (×{u.qtyInBase})
                            </option>
                          ))}
                      </Select>
                      </label>
                      <label className="block text-[11px] text-muted">
                        {t("receive.howMany", { unit: unitName })}
                        <Input
                          className="mt-0.5"
                          inputMode="numeric"
                          placeholder="0"
                          value={line.quantity}
                          onChange={(e) => update(line.key, { quantity: e.target.value.replace(/\D/g, "") })}
                        />
                      </label>
                      <label className="block text-[11px] text-muted">
                        {t("receive.costPer", { unit: unitName })}
                        <div className="relative mt-0.5">
                          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted">৳</span>
                          <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={line.unitCost}
                            className="pl-5"
                            onChange={(e) => update(line.key, { unitCost: e.target.value })}
                          />
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-[11px] text-muted">
                        {t("receive.batchNoOptional")}
                        <Input
                          className="mt-0.5"
                          placeholder={t("receive.batchNoShort")}
                          value={line.batchNo}
                          maxLength={50}
                          onChange={(e) => update(line.key, { batchNo: e.target.value })}
                        />
                      </label>
                      <label className="block text-[11px] text-muted">
                        {t("receive.expiryMonth")}
                        <Input
                          className="mt-0.5"
                          type="month"
                          value={line.expiryMonth}
                          onChange={(e) => update(line.key, { expiryMonth: e.target.value })}
                        />
                      </label>
                    </div>

                    <SellPriceBlock
                      line={line}
                      markupPercent={markupPercent}
                      onChange={(patch) => update(line.key, patch)}
                      onSuggest={(source) => fillSuggestions(line.key, source)}
                    />

                    {qty > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>
                          {`= ${(qty * qtyInBase).toLocaleString()} ${line.baseUnit}`}
                          {cost >= 0 && qtyInBase > 1 ? ` · ${formatCurrency(cost / qtyInBase)} / ${line.baseUnit}` : ""}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {cost >= 0 ? formatCurrency(qty * cost) : ""}
                        </span>
                      </div>
                    )}
                    {started && !line.expiryMonth && (
                      <p className="text-xs text-warning">{t("receive.noExpiry")}</p>
                    )}
                    {(problemByIndex.get(index) ?? (started ? lineErrors[index] : undefined)) && (
                      <p className="text-xs text-danger">{problemByIndex.get(index) ?? lineErrors[index]}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {lines.length > 0 && (
            <CardBody className="space-y-3 border-t border-border">
              <div className="flex justify-between text-base font-semibold">
                <span>{t("deliveries.totalCost")}</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("receive.paymentTitle")}</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("receive.paymentTitle")}>
                  {(["full", "partial", "credit"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={payMode === mode}
                      onClick={() => setPayMode(mode)}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-medium transition-colors",
                        payMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-foreground",
                      )}
                    >
                      {t(mode === "full" ? "receive.payFull" : mode === "partial" ? "receive.payPartial" : "receive.payCredit")}
                    </button>
                  ))}
                </div>
                {payMode !== "credit" && (
                  <div className="grid grid-cols-[1fr_7rem] gap-2">
                    <Input
                      aria-label={t("receive.paidNow")}
                      inputMode="decimal"
                      value={payMode === "full" ? total.toFixed(2) : paidNow}
                      disabled={payMode === "full"}
                      placeholder="0.00"
                      onChange={(e) => setPaidNow(e.target.value)}
                      className="tabular-nums"
                    />
                    <Select aria-label={t("sale.paidBy")} value={payMethod} onChange={(e) => setPayMethod(e.target.value as "cash" | "bkash")}>
                      <option value="cash">{t("paymentMethod.cash")}</option>
                      <option value="bkash">{t("paymentMethod.bkash")}</option>
                    </Select>
                  </div>
                )}
                {onAccount > 0 && !paymentError && (
                  <p className="text-xs text-warning">
                    {t("receive.onAccountHint", { amount: formatCurrency(onAccount), name: supplier?.name ?? "" })}
                  </p>
                )}
                {paymentError && <p className="text-xs text-danger">{paymentError}</p>}
              </div>

              <Button type="button" onClick={submit} disabled={submitting || hasErrors || !!paymentError} className="h-11 w-full">
                {submitting ? t("common.saving") : t("receive.save")}
              </Button>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}

function SupplierPicker({
  value,
  onChange,
  initialId,
}: {
  value: Supplier | null;
  onChange: (s: Supplier | null) => void;
  initialId?: number;
}) {
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const requestId = useRef(0);
  const t = useT();

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const found = await searchSuppliers(term);
      if (id === requestId.current) {
        setOptions(found);
        if (initialId && !value) {
          const match = found.find((s) => s.id === initialId);
          if (match) onChange(match);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  if (value) {
    return (
      <Field label={t("deliveries.supplier")}>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{value.name}</span>
            {value.phone && <span className="ml-2 text-muted">{value.phone}</span>}
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-primary hover:underline">
            {t("payment.change")}
          </button>
        </div>
      </Field>
    );
  }

  if (adding) {
    return (
      <Field label={t("receive.newSupplier")} error={error}>
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <Input placeholder={t("th.name")} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={150} autoFocus />
          <Input placeholder={`${t("th.phone")} (${t("common.optional").toLowerCase()})`} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} maxLength={30} />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || !newName.trim()}
              onClick={() =>
                start(async () => {
                  const r = await quickAddSupplier(newName, newPhone);
                  if (r.supplier) {
                    onChange(r.supplier);
                    setAdding(false);
                    setError(undefined);
                  } else {
                    setError(r.error);
                  }
                })
              }
            >
              {pending ? t("payment.adding") : t("payment.add")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </Field>
    );
  }

  return (
    <Field label={t("deliveries.supplier")} hint={t("receive.supplierHint")}>
      <div className="relative">
        <Input
          placeholder={t("receive.searchSuppliers")}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-md">
            {options.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background"
                >
                  <span>{s.name}</span>
                  {s.phone && <span className="text-xs text-muted">{s.phone}</span>}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setNewName(term);
                  setAdding(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-background"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {term.trim() ? t("receive.addNamedSupplier", { name: term.trim() }) : t("receive.addSupplier")}
              </button>
            </li>
          </ul>
        )}
      </div>
    </Field>
  );
}

/**
 * Selling prices for one delivery line. Collapsed to a one-line summary when
 * the medicine is already priced; open when it isn't (it can't be sold until
 * it is). Prices can be suggested from cost using the shop's default margin.
 */
function SellPriceBlock({
  line,
  markupPercent,
  onChange,
  onSuggest,
}: {
  line: Line;
  markupPercent: number | null;
  onChange: (patch: Partial<Line>) => void;
  onSuggest: (source: "mrp" | "markup") => void;
}) {
  const t = useT();
  const unpriced = line.sellRows.every((r) => r.current === null);
  const deliveredUnit = line.units.find((u) => u.id === line.unitId);
  const costPerBase = Number(line.unitCost) / (deliveredUnit?.qtyInBase ?? 1);
  const canMarkup = markupPercent !== null && costPerBase > 0;
  const changed = line.sellRows.some((r) => r.price !== "" && Number(r.price) !== r.current);
  const baseRow = line.sellRows.find((r) => r.qtyInBase === 1 && r.price !== "") ?? line.sellRows.find((r) => r.price !== "");
  const typedBase =
    baseRow === undefined ? undefined : Math.round((Number(baseRow.price) / baseRow.qtyInBase) * 100) / 100;

  function setRow(index: number, patch: Partial<SellRow>) {
    const rows = line.sellRows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange({ sellRows: patch.price === undefined ? rows : propagate(rows, index) });
  }

  if (!line.pricesOpen) {
    const shown = changed ? line.sellRows.filter((r) => r.price !== "") : line.sellRows.filter((r) => r.current !== null);
    return (
      <button
        type="button"
        onClick={() => onChange({ pricesOpen: true })}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs",
          unpriced && !changed
            ? "border-warning/50 bg-warning/5 text-warning"
            : "border-border bg-background text-muted hover:text-foreground",
        )}
      >
        <span className="min-w-0 truncate">
          {unpriced && !changed
            ? t("receive.priceMissing")
            : shown.map((r) => `${r.name} ${formatCurrency(Number(changed ? r.price : r.current))}`).join(" · ")}
        </span>
        <span className="shrink-0 font-medium">{changed ? "✓" : t("receive.changePrice")}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium">
          {t("receive.sellPriceTitle")}
          {line.mrp !== null && (
            <span className="ml-1.5 font-normal text-muted">
              {t("receive.mrpShort", { price: formatCurrency(line.mrp), unit: line.baseUnit })}
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {line.mrp !== null && (
            <button type="button" onClick={() => onSuggest("mrp")} className="text-primary underline">
              {t("receive.useMrpShort")}
            </button>
          )}
          {canMarkup && (
            <button type="button" onClick={() => onSuggest("markup")} className="text-primary underline">
              +{markupPercent}%
            </button>
          )}
          <button type="button" onClick={() => onChange({ pricesOpen: false })} className="text-muted hover:text-foreground">
            {t("common.close")}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {line.sellRows.map((row, index) => {
          const perBase = row.price === "" ? null : Number(row.price) / row.qtyInBase;
          const belowCost = perBase !== null && costPerBase > 0 && perBase < costPerBase;
          const aboveMrp = perBase !== null && line.mrp !== null && perBase > line.mrp + 0.005;
          return (
            <div key={`${row.name}-${index}`}>
              <div className="flex items-center gap-1 text-[11px] text-muted">
                <span className="shrink-0 font-medium text-foreground">{row.name}</span>
                <span>×</span>
                <input
                  inputMode="numeric"
                  aria-label={t("receive.unitSize", { unit: row.name })}
                  value={row.qtyInBase}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ""));
                    setRow(index, { qtyInBase: n > 0 ? n : 1 });
                  }}
                  disabled={row.current !== null && row.qtyInBase === 1}
                  className="h-5 w-10 shrink-0 rounded border border-border bg-surface px-1 text-center tabular-nums disabled:opacity-60"
                />
                {belowCost ? (
                  <span className="ml-auto truncate text-danger">{t("receive.belowCostShort")}</span>
                ) : aboveMrp ? (
                  <span className="ml-auto truncate text-warning">{t("receive.aboveMrpShort")}</span>
                ) : perBase !== null && costPerBase > 0 ? (
                  <span className="ml-auto truncate">
                    {t("receive.marginIs", { percent: Math.round(((perBase - costPerBase) / costPerBase) * 100) })}
                  </span>
                ) : null}
              </div>
              <div className="relative mt-0.5">
                <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted">৳</span>
                <Input
                  inputMode="decimal"
                  placeholder={row.current === null ? "0.00" : String(row.current)}
                  value={row.price}
                  className={cn("h-9 pl-5", belowCost && "border-danger")}
                  onChange={(e) => setRow(index, { price: e.target.value, manual: true })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {typedBase !== undefined && line.mrp !== null && Math.abs(typedBase - line.mrp) > 0.005 && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="shrink-0"
            checked={line.mrpRevised}
            onChange={(e) => onChange({ mrpRevised: e.target.checked })}
          />
          <span className="min-w-0">
            {t("receive.mrpRevisedShort", { price: formatCurrency(typedBase), unit: line.baseUnit })}
          </span>
        </label>
      )}

      {changed && line.stockBefore > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={line.priceWhen === "after_old_stock"} onChange={() => onChange({ priceWhen: "after_old_stock" })} />
            {t("receive.whenLaterShort", { count: line.stockBefore, unit: line.baseUnit })}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={line.priceWhen === "now"} onChange={() => onChange({ priceWhen: "now" })} />
            {t("receive.whenNowShort")}
          </label>
        </div>
      )}
    </div>
  );
}

function ItemSearch({ onSelect }: { onSelect: (item: ReceiveSearchResult) => void }) {
  const [term, setTerm] = useState("");
  const [state, setState] = useState<{ status: "idle" | "searching" | "done" | "failed"; results: ReceiveSearchResult[] }>({
    status: "idle",
    results: [],
  });
  const requestId = useRef(0);
  const t = useT();

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setState({ status: "idle", results: [] });
      return;
    }
    setState((s) => ({ ...s, status: "searching" }));
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const found = await searchForReceive(query);
        if (id === requestId.current) setState({ status: "done", results: found });
      } catch {
        if (id === requestId.current) setState({ status: "failed", results: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  return (
    <Card>
      <CardHeader title={t("receive.addMedicines")} description={t("receive.addMedicinesHint")} />
      <CardBody className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("receive.searchPlaceholder")}
            aria-label={t("pos.searchLabel")}
            className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
          />
          {state.status === "searching" && (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-label={t("filters.searching")} />
          )}
        </div>
        {state.status === "failed" && <Alert tone="error">{t("receive.searchFailed")}</Alert>}
        {state.status === "done" && state.results.length === 0 && (
          <p className="rounded-lg bg-background p-4 text-sm text-muted">
            {t("receive.nothingFound", { query: term.trim() })}{" "}
            <Link href={`/catalogue/new?name=${encodeURIComponent(term.trim())}`} className="font-medium text-primary underline">
              {t("receive.addNew", { query: term.trim() })}
            </Link>
          </p>
        )}
        <ul className="divide-y divide-border">
          {state.results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-3 text-left hover:bg-background active:bg-primary/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted">
                    {item.dosageForm}
                    {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted">
                  {item.stock === null ? t("receive.notCounted") : `${item.stock} ${item.baseUnit}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          {t("receive.newMedicineHint")}{" "}
          <Link href="/catalogue/new" className="font-medium text-primary underline">
            {t("receive.newMedicineLink")}
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * What was just received, over the form rather than instead of it: the shop
 * usually has a second delivery in the same pile, and the form behind is
 * already blank and waiting. Enter or Esc gets on with it.
 */
function ReceivedDialog({
  receipt,
  prices,
  onClose,
}: {
  receipt: StockReceipt;
  prices: { now: number; later: number };
  onClose: () => void;
}) {
  const t = useT();
  const owed = receipt.totalCost - receipt.paidAmount;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("receive.done")}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 pt-10 backdrop-blur-[1px]"
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardBody className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheck className="h-6 w-6 text-success" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t("receive.done")}</h2>
            <p className="mt-1 text-sm text-muted">{t("receive.doneHint")}</p>
          </div>
          <div className="rounded-xl bg-background p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t("deliveries.receipt")}</span>
              <span className="font-mono font-semibold">{receipt.receiptNumber}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">{t("deliveries.totalCost")}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(receipt.totalCost)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">{t("receive.paidNow")}</span>
              <span className="tabular-nums">{formatCurrency(receipt.paidAmount)}</span>
            </div>
            {owed > 0 && (
              <div className="mt-1 flex justify-between text-warning">
                <span>{t("receive.onAccount")}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(owed)}</span>
              </div>
            )}
            {prices.now > 0 && (
              <p className="mt-2 text-success">{t("receive.pricedNow", { count: prices.now })}</p>
            )}
            {prices.later > 0 && (
              <p className="mt-1 text-warning">{t("receive.pricedLater", { count: prices.later })}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/stock/receipts/${receipt.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background"
            >
              {t("receive.viewReceipt")}
            </Link>
            <Button className="h-10 flex-1" autoFocus onClick={onClose}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("receive.another")}
            </Button>
          </div>
          <p className="text-xs text-muted">{t("receive.doneKeys")}</p>
        </CardBody>
      </Card>
    </div>
  );
}
