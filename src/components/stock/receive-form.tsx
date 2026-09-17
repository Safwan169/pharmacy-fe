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
  units: { id: number; name: string; qtyInBase: number }[];
  unitId: number | "";
  quantity: string;
  unitCost: string;
  batchNo: string;
  expiryMonth: string; // YYYY-MM
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
export function ReceiveForm({ initialSupplierId }: { initialSupplierId?: number }) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayInDhaka());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [result, setResult] = useState<ReceiveResult | null>(null);
  const [saved, setSaved] = useState<StockReceipt | null>(null);
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
        unitId: biggest ? biggest.id : "",
        quantity: "",
        unitCost: "",
        batchNo: "",
        expiryMonth: "",
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
    return undefined;
  });
  const hasErrors = lineErrors.some(Boolean);

  const total = lines.reduce((sum, l) => {
    const qty = Number(l.quantity);
    const cost = Number(l.unitCost);
    return sum + (qty > 0 && cost >= 0 ? qty * cost : 0);
  }, 0);

  const problemIndexes = new Set(
    result?.status === "rejected" ? result.problems.map((p) => p.index) : [],
  );
  const problemByIndex = new Map(
    result?.status === "rejected" ? result.problems.map((p) => [p.index, p.message]) : [],
  );

  function submit() {
    if (lines.length === 0 || hasErrors) return;
    startSubmit(async () => {
      const response = await receiveStock({
        supplier_id: supplier?.id,
        supplier_invoice_no: invoiceNo.trim() || undefined,
        received_at: receivedAt || undefined,
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          variant_id: l.variantId,
          unit_id: l.unitId === "" ? undefined : l.unitId,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost),
          batch_no: l.batchNo.trim() || undefined,
          expiry_date: endOfMonth(l.expiryMonth),
        })),
      });
      setResult(response);
      if (response.status === "success") setSaved(response.receipt);
    });
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardBody className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheck className="h-6 w-6 text-success" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t("receive.done")}</h2>
            <p className="mt-1 text-sm text-muted">
              {t("receive.doneHint")}
            </p>
          </div>
          <div className="rounded-xl bg-background p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t("deliveries.receipt")}</span>
              <span className="font-mono font-semibold">{saved.receiptNumber}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">{t("deliveries.totalCost")}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(saved.totalCost)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/stock/receipts/${saved.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background"
            >
              {t("receive.viewReceipt")}
            </Link>
            <Button
              className="h-10 flex-1"
              onClick={() => {
                setSaved(null);
                setResult(null);
                setLines([]);
                setInvoiceNo("");
                setNote("");
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("receive.another")}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
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
                      <Select
                        aria-label={t("receive.unitIn")}
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
                      <Input
                        aria-label={t("th.quantity")}
                        inputMode="numeric"
                        placeholder={t("th.qty")}
                        value={line.quantity}
                        onChange={(e) => update(line.key, { quantity: e.target.value.replace(/\D/g, "") })}
                      />
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted">৳</span>
                        <Input
                          aria-label={t("receive.costPer", { unit: unitName })}
                          inputMode="decimal"
                          placeholder={t("th.costEach")}
                          value={line.unitCost}
                          className="pl-5"
                          onChange={(e) => update(line.key, { unitCost: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        aria-label={t("receive.batchNo")}
                        placeholder={t("receive.batchNoShort")}
                        value={line.batchNo}
                        maxLength={50}
                        onChange={(e) => update(line.key, { batchNo: e.target.value })}
                      />
                      <Input
                        aria-label={t("receive.expiryMonth")}
                        type="month"
                        value={line.expiryMonth}
                        onChange={(e) => update(line.key, { expiryMonth: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>
                        {qty > 0 ? `${(qty * qtyInBase).toLocaleString()} ${line.baseUnit}` : "—"}
                        {qty > 0 && cost >= 0 && qtyInBase > 1 ? ` · ${formatCurrency(cost / qtyInBase)} / ${line.baseUnit}` : ""}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {qty > 0 && cost >= 0 ? formatCurrency(qty * cost) : ""}
                      </span>
                    </div>
                    {!line.expiryMonth && (
                      <p className="text-xs text-warning">{t("receive.noExpiry")}</p>
                    )}
                    {(problemByIndex.get(index) ?? lineErrors[index]) && (
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
              <Button type="button" onClick={submit} disabled={submitting || hasErrors} className="h-11 w-full">
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
          <p className="rounded-lg bg-background p-4 text-sm text-muted">{t("receive.nothingFound", { query: term.trim() })}</p>
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
      </CardBody>
    </Card>
  );
}
