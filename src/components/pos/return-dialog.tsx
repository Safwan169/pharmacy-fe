"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  CircleCheck,
  Loader2,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { findSalesToReturn, returnItems, type ReturnResult } from "@/lib/actions/returns";
import { cn, formatCurrency } from "@/lib/utils";
import type { RefundMethod, Sale, SaleItem } from "@/types";
import { useT } from "@/i18n/client";

/** How much of one line is still with the customer. */
function left(item: SaleItem) {
  return item.quantity - item.returnedQuantity;
}

/** Mirrors the API: unit price less this line's share of the sale discount. */
function refundFor(sale: Sale, item: SaleItem, count: number) {
  const share = sale.subtotal === 0 ? 0 : (sale.discountAmount * item.lineTotal) / sale.subtotal;
  return ((item.lineTotal - share) * count) / item.quantity;
}

/** Money goes back the way it came, unless it was on credit. */
function defaultRefund(sale: Sale): RefundMethod {
  if (sale.paymentMethod === "bkash") return "bkash";
  if (sale.paymentMethod === "due") return "due_adjust";
  return "cash";
}

const METHODS: RefundMethod[] = ["cash", "bkash", "due_adjust"];

/**
 * Taking medicine back, from the counter, without leaving it. The customer is
 * standing there with a strip in hand — so the bill is found by whatever they
 * can offer (medicine name, phone, invoice), every line starts fully ticked,
 * and the whole thing is one keyboard run: find, Enter, Enter.
 */
export function ReturnDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [term, setTerm] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleCursor, setSaleCursor] = useState(0);
  const [picked, setPicked] = useState<Sale | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const found = await findSalesToReturn(term);
      if (requestId.current !== id) return;
      setSales(found);
      setSaleCursor(0);
      setLoading(false);
    }, term === "" ? 0 : 250);
    return () => clearTimeout(timer);
  }, [term]);

  // Every keystroke starts a fresh search, so say so straight away.
  function changeTerm(value: string) {
    setTerm(value);
    setLoading(true);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (picked !== null) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (sales.length === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setSaleCursor((c) => (c + (event.key === "ArrowDown" ? 1 : sales.length - 1)) % sales.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const sale = sales[saleCursor];
        if (sale !== undefined) setPicked(sale);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sales, saleCursor, picked, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ret.title")}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 pt-10 backdrop-blur-[1px]"
    >
      <Card className="w-full max-w-2xl shadow-xl">
        {picked === null ? (
          <>
            <CardHeader
              title={t("ret.title")}
              description={t("ret.findHint")}
              action={
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              }
            />
            <CardBody className="space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  value={term}
                  onChange={(e) => changeTerm(e.target.value)}
                  placeholder={t("ret.searchPlaceholder")}
                  aria-label={t("ret.searchPlaceholder")}
                  className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
                />
                {loading && (
                  <Loader2
                    className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
                    aria-label={t("filters.searching")}
                  />
                )}
              </div>

              {!loading && sales.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  {term === "" ? t("ret.noneRecent") : t("ret.noneFound")}
                </p>
              ) : (
                <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
                  {sales.map((sale, index) => (
                    <li key={sale.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(sale)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-lg px-2 py-2.5 text-left",
                          index === saleCursor ? "bg-primary/5 ring-1 ring-primary/40" : "hover:bg-background",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-xs font-medium text-primary">{sale.invoiceNumber}</span>
                            <span className="text-xs text-muted">
                              {new Date(sale.createdAt).toLocaleString([], {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {sale.customer?.name && (
                              <span className="truncate text-xs text-muted">· {sale.customer.name}</span>
                            )}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-sm">
                            {(sale.items ?? [])
                              .map((i) => `${i.brandNameSnapshot} ×${left(i)}`)
                              .join(", ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-muted">{t("ret.pickKeys")}</p>
            </CardBody>
          </>
        ) : (
          <ReturnLines
            sale={picked}
            onBack={() => {
              setPicked(null);
              inputRef.current?.focus();
            }}
            onClose={onClose}
          />
        )}
      </Card>
    </div>
  );
}

function ReturnLines({
  sale,
  onBack,
  onClose,
}: {
  sale: Sale;
  onBack: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const returnable = (sale.items ?? []).filter((item) => left(item) > 0);
  // Whoever is at the counter usually wants the whole line back, so that is
  // where each one starts; trimming is the exception, not the rule.
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(returnable.map((item) => [item.id, left(item)])),
  );
  const [keep, setKeep] = useState<Record<number, boolean>>({});
  const [method, setMethod] = useState<RefundMethod>(defaultRefund(sale));
  const [cursor, setCursor] = useState(0);
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [pending, start] = useTransition();

  const chosen = returnable
    .map((item) => ({ item, quantity: counts[item.id] ?? 0 }))
    .filter((line) => line.quantity > 0);
  const total = chosen.reduce((sum, line) => sum + refundFor(sale, line.item, line.quantity), 0);
  const done = result?.status === "success";

  function submit() {
    if (pending || chosen.length === 0) return;
    start(async () => {
      setResult(
        await returnItems({
          saleId: sale.id,
          items: chosen.map((line) => ({
            sale_item_id: line.item.id,
            quantity: line.quantity,
            restock: !(keep[line.item.id] ?? false),
          })),
          refund_method: method,
        }),
      );
    });
  }

  // The key handler is bound once per line change; routing Enter through a ref
  // keeps it firing the current basket rather than the one it was born with.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (done) {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const item = returnable[cursor];
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onBack();
          return;
        case "Enter":
          event.preventDefault();
          submitRef.current();
          return;
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          setCursor((c) => (c + (event.key === "ArrowDown" ? 1 : returnable.length - 1)) % returnable.length);
          return;
        case "1":
        case "2":
        case "3":
          event.preventDefault();
          setMethod(METHODS[Number(event.key) - 1]);
          return;
      }
      if (item === undefined) return;
      if (event.key === "+" || event.key === "=" || event.key === "ArrowRight") {
        event.preventDefault();
        setCounts((c) => ({ ...c, [item.id]: Math.min((c[item.id] ?? 0) + 1, left(item)) }));
        return;
      }
      if (event.key === "-" || event.key === "ArrowLeft") {
        event.preventDefault();
        setCounts((c) => ({ ...c, [item.id]: Math.max((c[item.id] ?? 0) - 1, 0) }));
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        setCounts((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) > 0 ? 0 : left(item) }));
        return;
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setKeep((k) => ({ ...k, [item.id]: !(k[item.id] ?? false) }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [returnable, cursor, onBack, onClose, done]);

  if (result?.status === "success") {
    return (
      <>
        <CardHeader title={t("undo.recorded")} description={result.returnNumber} />
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <CircleCheck className="h-4 w-4" aria-hidden />
              {method === "due_adjust" ? t("ret.tookOffDue") : t("undo.giveCustomer")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(result.refundAmount)}</p>
          </div>
          <Button onClick={onClose} autoFocus className="h-11 w-full">
            {t("ret.backToCounter")}
          </Button>
          <p className="text-xs text-muted">{t("ret.doneKeys")}</p>
        </CardBody>
      </>
    );
  }

  const problems = new Map(
    result?.status === "rejected" ? result.problems.map((p) => [p.saleItemId, p.message]) : [],
  );

  return (
    <>
      <CardHeader
        title={sale.invoiceNumber}
        description={t("ret.linesHint")}
        action={
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("ret.otherBill")}
          </button>
        }
      />
      <CardBody className="space-y-4">
        {result?.status === "error" && <Alert tone="error">{result.message}</Alert>}
        {result?.status === "rejected" && <Alert tone="error">{t("undo.fixLines")}</Alert>}

        <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto">
          {returnable.map((item, index) => {
            const count = counts[item.id] ?? 0;
            const damaged = keep[item.id] ?? false;
            const problem = problems.get(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  index === cursor && "bg-primary/5 ring-1 ring-primary/40",
                  problem && "bg-danger/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCursor(index);
                    setCounts((c) => ({ ...c, [item.id]: count > 0 ? 0 : left(item) }));
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="line-clamp-1 text-sm font-medium">
                    {item.brandNameSnapshot}
                    {item.strengthSnapshot ? ` ${item.strengthSnapshot}` : ""}
                  </span>
                  <span className="text-xs text-muted">
                    {t("ret.soldLine", {
                      qty: left(item),
                      unit: item.unitNameSnapshot,
                      price: formatCurrency(item.unitPrice),
                    })}
                    {damaged ? ` · ${t("ret.damaged")}` : ""}
                  </span>
                  {problem && <span className="block text-xs text-danger">{problem}</span>}
                </button>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("ret.less")}
                    onClick={() => setCounts((c) => ({ ...c, [item.id]: Math.max(count - 1, 0) }))}
                    className="h-7 w-7 rounded-md border border-border text-sm hover:bg-background"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums">
                    {count}
                    <span className="text-xs font-normal text-muted">/{left(item)}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={t("ret.more")}
                    onClick={() => setCounts((c) => ({ ...c, [item.id]: Math.min(count + 1, left(item)) }))}
                    className="h-7 w-7 rounded-md border border-border text-sm hover:bg-background"
                  >
                    +
                  </button>
                </span>
                <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                  {count > 0 ? formatCurrency(refundFor(sale, item, count)) : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t("undo.refundHow")}</span>
          {METHODS.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => setMethod(option)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                option === method
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-background",
              )}
            >
              <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px] text-muted">
                {index + 1}
              </kbd>
              {t(option === "cash" ? "refund.cash" : option === "bkash" ? "refund.bkash" : "refund.dueShort")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-3">
          <Button
            onClick={submit}
            disabled={pending || chosen.length === 0}
            className="h-12 flex-1 text-base"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Undo2 className="h-4 w-4" aria-hidden />
            )}
            {t("ret.refundAmount", { amount: formatCurrency(total) })}
          </Button>
        </div>
        <p className="text-xs text-muted">{t("ret.lineKeys")}</p>
      </CardBody>
    </>
  );
}
