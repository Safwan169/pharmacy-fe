"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  CircleAlert,
  Check,
  Pill,
  TrendingUp,
  Keyboard,
  Undo2,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  searchForCounter,
  type CounterSearchResult,
  type CounterUnit,
} from "@/lib/actions/search";
import { checkout, type CheckoutResult } from "@/lib/actions/checkout";
import { formatCurrency, cn } from "@/lib/utils";
import type { DiscountType, Sale } from "@/types";
import { SaleReceipt } from "./sale-receipt";
import { ReturnDialog } from "./return-dialog";
import { PaymentPanel, type PaymentChoice } from "./payment-panel";
import { loadHeldSales, newHeldSale, saveHeldSales, splitLine, type HeldSale } from "./held-sales";
import { PauseCircle, PlayCircle } from "lucide-react";
import { useT } from "@/i18n/client";

interface BasketLine {
  variantId: number;
  name: string;
  dosageForm: string;
  /** The unit being sold — strip, box, bottle. */
  unitId: number;
  unitName: string;
  qtyInBase: number;
  unitPrice: number;
  nextPrice?: { price: number; oldStockLeft: number };
  /** Base-unit stock at the time it was added — a guard rail, not the final word. */
  stockAtAdd: number;
  /** In the sold unit. */
  quantity: number;
}

export function CounterTerminal({ favourites = [] }: { favourites?: CounterSearchResult[] }) {
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [payment, setPayment] = useState<PaymentChoice>({ method: "cash" });
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const [submitting, startCheckout] = useTransition();
  // The variant that was just added, plus a counter so adding the same item
  // twice in a row restarts the animation instead of being a no-op.
  const [justAdded, setJustAdded] = useState<{ id: number; nonce: number } | null>(
    null,
  );
  const addNonce = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const payRef = useRef<HTMLButtonElement>(null);
  const searchHandle = useRef<SearchHandle | null>(null);
  // Which basket line the keyboard is on. Null while the search box is
  // driving, so the ring only appears once the arrows actually mean the basket.
  const [lineCursor, setLineCursor] = useState<number | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [returning, setReturning] = useState(false);
  const t = useT();
  // Parked baskets. Read once on mount (localStorage isn't there on the server).
  const [held, setHeld] = useState<HeldSale[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
    setHeld(loadHeldSales());
  }, []);

  function holdSale() {
    if (basket.length === 0) return;
    const label = window.prompt(t("hold.promptLabel"), payment.customer?.name ?? "") ?? "";
    const entry = newHeldSale(label.trim() || t("hold.unnamed", { n: held.length + 1 }), basket, discountType, discountValue);
    const next = [entry, ...held];
    setHeld(next);
    saveHeldSales(next);
    setBasket([]);
    setDiscountValue("");
    setPayment({ method: "cash" });
    setResult(null);
  }

  function resumeSale(entry: HeldSale) {
    // Anything in the basket now is parked in its place, so nothing is lost.
    const rest = held.filter((h) => h.id !== entry.id);
    const next = basket.length > 0
      ? [newHeldSale(t("hold.unnamed", { n: rest.length + 1 }), basket, discountType, discountValue), ...rest]
      : rest;
    setHeld(next);
    saveHeldSales(next);
    setBasket(entry.lines);
    setDiscountType(entry.discountType);
    setDiscountValue(entry.discountValue);
    setResult(null);
    setShowHeld(false);
  }

  function discardHeld(id: string) {
    const next = held.filter((h) => h.id !== id);
    setHeld(next);
    saveHeldSales(next);
  }

  const problemIds = useMemo(
    () =>
      result?.status === "rejected"
        ? new Set(result.problems.map((p) => p.variantId))
        : new Set<number>(),
    [result],
  );

  const addItem = useCallback((item: CounterSearchResult, unit: CounterUnit, quantity = 1) => {
    // Adding the same item twice must merge into one line: the API rejects a
    // basket that lists a variant more than once. Picking a different unit
    // for an item already in the basket switches that line to the new unit.
    setBasket((current) => {
      const existing = current.find((line) => line.variantId === item.id);
      if (existing) {
        return current.map((line) =>
          line.variantId !== item.id
            ? line
            : line.unitId === unit.id
              ? { ...line, quantity: line.quantity + quantity }
              : {
                  ...line,
                  unitId: unit.id,
                  unitName: unit.name,
                  qtyInBase: unit.qtyInBase,
                  unitPrice: unit.price,
                  nextPrice: unit.nextPrice,
                  quantity,
                },
        );
      }
      return [
        ...current,
        {
          variantId: item.id,
          name: item.name,
          dosageForm: item.dosageForm,
          unitId: unit.id,
          unitName: unit.name,
          qtyInBase: unit.qtyInBase,
          unitPrice: unit.price,
          nextPrice: unit.nextPrice,
          stockAtAdd: item.stock ?? 0,
          quantity,
        },
      ];
    });
    setResult(null);
    setJustAdded({ id: item.id, nonce: ++addNonce.current });
  }, []);

  function setQuantity(variantId: number, quantity: number) {
    if (quantity < 1) return;
    setBasket((current) =>
      current.map((line) =>
        line.variantId === variantId ? { ...line, quantity } : line,
      ),
    );
    setResult(null);
  }

  function removeItem(variantId: number) {
    setBasket((current) => current.filter((line) => line.variantId !== variantId));
    setResult(null);
  }

  // The flash is a one-shot; clearing it means a later re-render (a quantity
  // tweak, say) doesn't replay it.
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(null), 900);
    return () => clearTimeout(timer);
  }, [justAdded]);

  // One listener for the whole counter, so nothing depends on where the
  // cashier last clicked: typing searches, the arrows pick, Enter adds, and
  // when the search box is empty those same arrows edit the basket instead.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // A dialog on top owns the keyboard while it is open.
      if (completed || returning) return;
      if (event.key === "F7") {
        event.preventDefault();
        setReturning(true);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target !== null &&
        target !== searchRef.current &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      // The two jumps work even from the discount or cash box.
      if (event.key === "F2") {
        event.preventDefault();
        searchHandle.current?.focus();
        return;
      }
      if (event.key === "F4") {
        event.preventDefault();
        payRef.current?.scrollIntoView({ block: "center" });
        payRef.current?.focus();
        return;
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        payRef.current?.click();
        return;
      }
      if (typingElsewhere) {
        if (event.key === "Escape") (target as HTMLInputElement).blur();
        return;
      }

      const search = searchHandle.current;
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setShowKeys((open) => !open);
        return;
      }
      if (showKeys && event.key === "Escape") {
        event.preventDefault();
        setShowKeys(false);
        return;
      }
      // With the search box empty, the number keys are the quick-pick tiles.
      if (/^[1-9]$/.test(event.key) && !search?.hasResults() && favourites.length > 0) {
        const item = favourites[Number(event.key) - 1];
        if (item !== undefined) {
          event.preventDefault();
          addItem(item, item.units.find((u) => u.isDefault) ?? item.units[0]);
          return;
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        search?.clear();
        return;
      }
      if (search?.hasResults()) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          search.move(event.key === "ArrowDown" ? 1 : -1);
          return;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          search.cycleUnit();
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          setLineCursor(null);
          search.commit();
          return;
        }
      } else if (basket.length > 0 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Nothing to pick from, so the arrows belong to the basket.
        const line = basket[Math.min(lineCursor ?? 0, basket.length - 1)];
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setLineCursor((c) => {
            if (c === null) return event.key === "ArrowDown" ? 0 : basket.length - 1;
            return (c + (event.key === "ArrowDown" ? 1 : basket.length - 1)) % basket.length;
          });
          return;
        }
        if (event.key === "+" || event.key === "=" || event.key === "ArrowRight") {
          event.preventDefault();
          setQuantity(line.variantId, line.quantity + 1);
          return;
        }
        if (event.key === "-" || event.key === "ArrowLeft") {
          event.preventDefault();
          if (line.quantity > 1) setQuantity(line.variantId, line.quantity - 1);
          return;
        }
        if (event.key === "Delete") {
          event.preventDefault();
          removeItem(line.variantId);
          return;
        }
      }

      // Anything printable goes to the search box, wherever the focus was.
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (target === searchRef.current) return;
        event.preventDefault();
        setLineCursor(null);
        search?.type(event.key);
        return;
      }
      if (event.key === "Backspace" && target !== searchRef.current) {
        event.preventDefault();
        search?.backspace();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [basket, lineCursor, favourites, addItem, completed, showKeys, returning]);

  const subtotal = basket.reduce((sum, line) => sum + splitLine(line).total, 0);

  const parsedDiscount = Number(discountValue);
  const discountAmount = (() => {
    if (!discountValue || Number.isNaN(parsedDiscount) || parsedDiscount <= 0) return 0;
    const raw =
      discountType === "percentage"
        ? (subtotal * Math.min(parsedDiscount, 100)) / 100
        : parsedDiscount;
    // The API clamps the discount to the subtotal so a total can't go negative;
    // showing the same here keeps the preview honest.
    return Math.min(raw, subtotal);
  })();

  const total = subtotal - discountAmount;

  const discountError = (() => {
    if (!discountValue) return undefined;
    if (Number.isNaN(parsedDiscount)) return t("pos.discountNumbers");
    if (parsedDiscount < 0) return t("pos.discountNegative");
    if (discountType === "percentage" && parsedDiscount > 100) {
      return t("pos.discountOver100");
    }
    return undefined;
  })();

  const paymentError = (() => {
    if (payment.method === "cash" && payment.amountTendered !== undefined && payment.amountTendered < total) {
      return t("pos.cashShort");
    }
    if (payment.method === "due" && !payment.customer) {
      return t("pos.pickCustomer");
    }
    return undefined;
  })();

  function submit() {
    if (basket.length === 0 || discountError || paymentError) return;

    startCheckout(async () => {
      const response = await checkout({
        items: basket.map((line) => ({
          variant_id: line.variantId,
          unit_id: line.unitId,
          quantity: line.quantity,
          name: `${line.name} (${line.unitName})`,
        })),
        discount:
          discountAmount > 0 && !Number.isNaN(parsedDiscount)
            ? { type: discountType, value: parsedDiscount }
            : undefined,
        payment_method: payment.method,
        amount_tendered: payment.method === "cash" ? payment.amountTendered : undefined,
        bkash_trx_id: payment.method === "bkash" ? payment.bkashTrxId : undefined,
        customer_id: payment.method === "due" ? payment.customer?.id : undefined,
      });

      setResult(response);
      if (response.status === "success") {
        setCompleted(response.sale);
        setBasket([]);
        setDiscountValue("");
        setPayment({ method: "cash" });
      }
    });
  }


  const addedLine = justAdded
    ? basket.find((line) => line.variantId === justAdded.id)
    : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {completed && (
        <SaleReceipt
          sale={completed}
          onNewSale={() => {
            setCompleted(null);
            setResult(null);
            searchHandle.current?.focus();
          }}
        />
      )}
      {showKeys && <KeyHelp onClose={() => setShowKeys(false)} />}
      {returning && (
        <ReturnDialog
          onClose={() => {
            setReturning(false);
            searchHandle.current?.focus();
          }}
        />
      )}
      {/* The flash and the badge are visual only; this is what a screen
          reader hears when something lands in the basket. */}
      <p aria-live="polite" className="sr-only">
        {addedLine
          ? t("pos.addedAnnounce", { name: addedLine.name, count: addedLine.quantity })
          : ""}
      </p>

      <div className="space-y-4 lg:col-span-3">
        <ItemSearch onSelect={addItem} justAdded={justAdded} inputRef={searchRef} handleRef={searchHandle} />
        <Favourites items={favourites} onSelect={addItem} onShowKeys={() => setShowKeys(true)} />
      </div>

      <div id="basket" className="scroll-mt-4 pb-16 lg:pb-0 lg:sticky lg:top-2 lg:col-span-2 lg:self-start">
        <Card className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <CardHeader
            title={t("pos.basket")}
            description={
              basket.length === 0
                ? t("pos.nothingAdded")
                : t(basket.length === 1 ? "pos.itemCount" : "pos.itemsCount", { count: basket.length })
            }
            action={
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReturning(true)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />
                  {t("ret.button")}
                </button>
                {basket.length > 0 && (
                  <button
                    type="button"
                    onClick={holdSale}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                  >
                    <PauseCircle className="h-3.5 w-3.5" aria-hidden />
                    {t("hold.hold")}
                  </button>
                )}
                {held.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHeld((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-xs font-medium text-warning hover:bg-warning/25"
                  >
                    <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                    {t("hold.held", { count: held.length })}
                  </button>
                )}
              </span>
            }
          />

          {showHeld && held.length > 0 && (
            <ul className="divide-y divide-border border-b border-border bg-background/60">
              {held.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 px-5 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{h.label}</p>
                    <p className="text-xs text-muted">
                      {t(h.lines.length === 1 ? "pos.itemCount" : "pos.itemsCount", { count: h.lines.length })} ·{" "}
                      {formatCurrency(h.lines.reduce((s, l) => s + splitLine(l).total, 0))} ·{" "}
                      {new Date(h.heldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => resumeSale(h)} className="text-xs font-medium text-primary hover:underline">
                      {t("hold.resume")}
                    </button>
                    <button type="button" onClick={() => discardHeld(h.id)} className="text-xs text-muted hover:text-danger">
                      {t("hold.discard")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {result?.status === "rejected" && (
            <div className="px-5 pt-5 pb-5">
              <Alert tone="error" title={t("pos.notCompleted")}>
                <p>{result.summary}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {result.problems.map((problem) => (
                    <li key={problem.variantId}>{problem.message}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          {result?.status === "error" && (
            <div className="px-5 pt-5">
              <Alert tone="error">{result.message}</Alert>
            </div>
          )}

          {basket.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={t("pos.basketEmpty")}
              description={t("pos.basketEmptyHint")}
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {basket.map((line, index) => {
                  const flagged = problemIds.has(line.variantId);
                  const added = justAdded?.id === line.variantId;
                  // Only marked once the search box is empty, because that is
                  // when the arrow keys drive the basket rather than the list.
                  const onCursor = lineCursor !== null && index === Math.min(lineCursor, basket.length - 1);
                  return (
                    <li
                      // Re-keying on the nonce remounts the line, which is what
                      // makes the animation restart on a repeat add.
                      key={
                        added
                          ? `${line.variantId}-${justAdded.nonce}`
                          : line.variantId
                      }
                      className={cn(
                        "px-5 py-3",
                        flagged && "bg-danger/5",
                        added && "animate-basket-pop",
                        onCursor && "bg-primary/5 ring-1 ring-primary/30 ring-inset",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {flagged && (
                              <CircleAlert
                                className="mr-1 inline h-3.5 w-3.5 text-danger"
                                aria-label={t("pos.needsAttention")}
                              />
                            )}
                            {line.name}
                          </p>
                          <p className="text-xs text-muted">
                            {line.dosageForm} · {formatCurrency(line.unitPrice)} / {line.unitName}
                            {line.qtyInBase > 1 ? ` ×${line.qtyInBase}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(line.variantId)}
                          aria-label={t("pos.removeLine", { name: line.name })}
                          className="rounded-md p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                          <QuantityButton
                            label={t("pos.reduceQty", { name: line.name })}
                            onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </QuantityButton>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.quantity}
                            aria-label={t("pos.qtyOf", { name: line.name })}
                            onChange={(e) => {
                              const next = Number(e.target.value.replace(/\D/g, ""));
                              if (next >= 1) setQuantity(line.variantId, next);
                            }}
                            className="h-7 w-12 rounded-md border border-border bg-surface text-center text-sm tabular-nums focus:border-primary focus:outline-2 focus:outline-primary/30"
                          />
                          <QuantityButton
                            label={t("pos.increaseQty", { name: line.name })}
                            onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </QuantityButton>
                        </div>

                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(splitLine(line).total)}
                        </span>
                      </div>

                      {line.nextPrice && splitLine(line).newUnits > 0 && (
                        <p className="mt-1.5 text-xs text-muted">
                          {t("pos.splitLine", {
                            oldQty: splitLine(line).oldUnits,
                            oldPrice: formatCurrency(line.unitPrice),
                            newQty: splitLine(line).newUnits,
                            newPrice: formatCurrency(line.nextPrice.price),
                            unit: line.unitName,
                          })}
                        </p>
                      )}

                      {line.quantity * line.qtyInBase > line.stockAtAdd && (
                        <p className="mt-1.5 text-xs text-warning">
                          {t("pos.stockWarning", { count: Math.floor(line.stockAtAdd / line.qtyInBase), unit: line.unitName })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p className="hidden px-5 pb-1 text-xs text-muted lg:block">{t("pos.basketKeys")}</p>

              <CardBody className="space-y-4 border-t border-border">
                <div>
                  <label
                    htmlFor="discount"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("pos.discount")}{" "}
                    <span className="font-normal text-muted">({t("common.optional").toLowerCase()})</span>
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      aria-label={t("pos.discountType")}
                      className="h-10 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm focus:border-primary focus:outline-2 focus:outline-primary/30"
                    >
                      <option value="percentage">%</option>
                      <option value="flat">৳</option>
                    </select>
                    <input
                      id="discount"
                      type="text"
                      inputMode="decimal"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      aria-invalid={!!discountError}
                      className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm tabular-nums focus:border-primary focus:outline-2 focus:outline-primary/30 aria-[invalid=true]:border-danger"
                    />
                  </div>
                  {discountError && (
                    <p className="mt-1 text-xs text-danger">{discountError}</p>
                  )}
                </div>

                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">{t("pos.subtotal")}</dt>
                    <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>{t("pos.discount")}</dt>
                      <dd className="tabular-nums">−{formatCurrency(discountAmount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                    <dt>{t("pos.totalToPay")}</dt>
                    <dd className="tabular-nums">{formatCurrency(total)}</dd>
                  </div>
                </dl>

                <div className="border-t border-border pt-4">
                  <PaymentPanel total={total} value={payment} onChange={setPayment} />
                  {paymentError && <p className="mt-2 text-xs text-danger">{paymentError}</p>}
                </div>

                <Button
                  ref={payRef}
                  type="button"
                  onClick={submit}
                  disabled={submitting || !!discountError || !!paymentError}
                  className="h-11 w-full"
                >
                  {submitting
                    ? t("common.saving")
                    : payment.method === "due"
                      ? `${t("pos.recordOnAccount")} · ${formatCurrency(total)}`
                      : `${t("pos.takePayment")} · ${formatCurrency(total)}`}
                </Button>
              </CardBody>
            </>
          )}
        </Card>
      </div>

      {/* On a phone the basket sits below the results; this keeps the total
          and a jump link in reach while scrolling through medicines. */}
      {basket.length > 0 && (
        <a
          href="#basket"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg lg:hidden"
        >
          <span>
            <ShoppingCart className="mr-2 inline h-4 w-4" aria-hidden />
            {t(basket.length === 1 ? "pos.itemCount" : "pos.itemsCount", { count: basket.length })}
          </span>
          <span className="tabular-nums">{formatCurrency(total)} →</span>
        </a>
      )}
    </div>
  );
}

function QuantityButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Type-ahead lookup. Debounced so a fast typist doesn't queue up requests. */
/**
 * One-tap tiles for what the shop sells most, so the common medicines need no
 * typing at all. Each tile adds the medicine in its default unit; the price
 * shown is that unit's, which is what the customer will be charged.
 */
function Favourites({
  items,
  onSelect,
  onShowKeys,
}: {
  items: CounterSearchResult[];
  onSelect: (item: CounterSearchResult, unit: CounterUnit) => void;
  onShowKeys: () => void;
}) {
  const t = useT();
  if (items.length === 0) return null;

  return (
    <section aria-label={t("pos.favourites")} className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h2 className="text-sm font-semibold">{t("pos.favourites")}</h2>
        <span className="hidden truncate text-xs text-muted sm:inline">{t("pos.favouritesHint")}</span>
        <button
          type="button"
          onClick={onShowKeys}
          className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted hover:text-foreground"
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden />
          {t("pos.keyHelp")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => {
          const unit = item.units.find((u) => u.isDefault) ?? item.units[0];
          const low = (item.stock ?? 0) < unit.qtyInBase * 3;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item, unit)}
              className="group relative flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary/60 hover:shadow-sm active:translate-y-0 active:bg-primary/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Pill className="h-4 w-4 group-hover:hidden" aria-hidden />
                <Plus className="hidden h-4 w-4 group-hover:block" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium">{item.name}</span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-xs", low ? "text-warning" : "text-muted")}>
                    {low ? t("pos.onlyLeft", { count: item.stock ?? 0, unit: item.baseUnit }) : unit.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(unit.price)}</span>
                </span>
              </span>
              {index < 9 && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 rounded px-1 text-[10px] font-medium text-muted/70 tabular-nums"
                >
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The whole keyboard, in one place, for whoever is new at the till. */
function KeyHelp({ onClose }: { onClose: () => void }) {
  const t = useT();
  const rows: [string, string][] = [
    ["A–Z", t("keys.type")],
    ["1–9", t("keys.tiles")],
    ["↑ ↓", t("keys.move")],
    ["Tab", t("keys.unit")],
    ["Enter", t("keys.add")],
    ["x5 + Enter", t("keys.qty")],
    ["+ / −", t("keys.plusMinus")],
    ["Delete", t("keys.remove")],
    ["Esc", t("keys.clear")],
    ["F2", t("keys.search")],
    ["F4", t("keys.pay")],
    ["Ctrl+Enter", t("keys.finish")],
    ["F7", t("keys.return")],
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pos.keyHelp")}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 pt-10"
    >
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader
          title={t("pos.keyHelp")}
          description={t("keys.hint")}
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
        <CardBody>
          <dl className="divide-y divide-border text-sm">
            {rows.map(([key, what]) => (
              <div key={key} className="flex items-center gap-3 py-2">
                <dt className="w-28 shrink-0">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
                </dt>
                <dd className="text-muted">{what}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

/** What the counter's global key handling can ask of the search box. */
export interface SearchHandle {
  focus(): void;
  clear(): void;
  hasResults(): boolean;
  move(delta: number): void;
  cycleUnit(): void;
  /** Adds the highlighted medicine. True when something was added. */
  commit(): boolean;
  type(char: string): void;
  backspace(): void;
}

/** "napa x10" / "napa *10" — the trailing count, POS style. */
function splitQuantity(raw: string): { query: string; quantity: number } {
  const match = /^(.*?)[\s]*[x*×]\s*(\d{1,4})$/i.exec(raw.trim());
  if (!match || match[1].trim() === "") return { query: raw.trim(), quantity: 1 };
  return { query: match[1].trim(), quantity: Math.max(1, Number(match[2])) };
}

function ItemSearch({
  onSelect,
  justAdded,
  inputRef,
  handleRef,
}: {
  onSelect: (item: CounterSearchResult, unit: CounterUnit, quantity?: number) => void;
  justAdded: { id: number; nonce: number } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleRef: React.RefObject<SearchHandle | null>;
}) {
  const [term, setTerm] = useState("");
  // One object rather than three flags, so a result can never be shown next to
  // a stale "searching" spinner or a leftover error.
  const [state, setState] = useState<{
    status: "idle" | "searching" | "done" | "failed";
    results: CounterSearchResult[];
  }>({ status: "idle", results: [] });
  const requestId = useRef(0);
  // Which row the keyboard is on, and which of that row's units is chosen.
  const [cursor, setCursor] = useState({ row: 0, unit: 0 });
  const t = useT();

  // The term is mirrored in a ref so that keystrokes arriving faster than a
  // re-render — a fast typist, or a barcode scanner "typing" a whole code in a
  // few milliseconds — still append to each other instead of overwriting.
  const termRef = useRef("");
  const applyTerm = useCallback((value: string) => {
    termRef.current = value;
    setTerm(value);
    setCursor({ row: 0, unit: 0 });
    // Clearing and the spinner both belong to the keystroke, not to an effect —
    // deriving them here keeps the effect purely about the debounced request.
    setState(
      splitQuantity(value).query.length < 1
        ? { status: "idle", results: [] }
        : { status: "searching", results: [] },
    );
  }, []);

  function handleChange(value: string) {
    applyTerm(value);
  }

  useEffect(() => {
    const query = splitQuantity(term).query;
    if (query.length < 1) return;

    const id = ++requestId.current;

    const timer = setTimeout(async () => {
      try {
        const found = await searchForCounter(query);
        // A slow earlier request must not overwrite a newer one's results.
        if (id === requestId.current) {
          setState({ status: "done", results: found });
        }
      } catch {
        if (id === requestId.current) {
          setState({ status: "failed", results: [] });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [term]);

  const { status, results } = state;
  const searching = status === "searching";
  const failed = status === "failed";

  const { query, quantity } = splitQuantity(term);
  // Only rows that can actually be rung up take part in keyboard selection.
  const sellableRows = results.filter((item) => item.units.length > 0 && (item.stock ?? 0) > 0);
  const row = Math.min(cursor.row, Math.max(sellableRows.length - 1, 0));
  const current = sellableRows[row];
  const currentUnit =
    current === undefined
      ? undefined
      : current.units[Math.min(cursor.unit, current.units.length - 1)] ??
        current.units.find((u) => u.isDefault) ??
        current.units[0];

  // The counter listens for keys on the whole page, so the same moves work
  // whether the cashier last touched the search box, a tile or the basket.
  // The handle reads through a ref of the latest render, which keeps it stable
  // without going stale.
  const latest = useRef({ row, cursor, current, currentUnit, quantity, sellableRows, onSelect });
  useEffect(() => {
    latest.current = { row, cursor, current, currentUnit, quantity, sellableRows, onSelect };
  });

  useEffect(() => {
    const set = (value: string) => {
      applyTerm(value);
      inputRef.current?.focus();
    };
    handleRef.current = {
      focus() {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      clear: () => set(""),
      hasResults: () => latest.current.sellableRows.length > 0,
      move(delta) {
        const rows = latest.current.sellableRows;
        if (rows.length === 0) return;
        setCursor({ row: (latest.current.row + delta + rows.length) % rows.length, unit: 0 });
      },
      cycleUnit() {
        const { current: item, cursor: at, row: atRow } = latest.current;
        if (item === undefined || item.units.length < 2) return;
        setCursor({ row: atRow, unit: (at.unit + 1) % item.units.length });
      },
      commit() {
        const { current: item, currentUnit: unit, quantity: qty } = latest.current;
        if (item === undefined || unit === undefined) return false;
        latest.current.onSelect(item, unit, qty);
        set("");
        return true;
      },
      type: (char) => set(termRef.current + char),
      backspace: () => set(termRef.current.slice(0, -1)),
    };
    const handle = handleRef;
    return () => {
      handle.current = null;
    };
  }, [applyTerm, handleRef, inputRef]);

  return (
    <Card>
      <CardHeader
        title={t("pos.find")}
        description={t("pos.findHint")}
      />
      <CardBody className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={term}
            autoFocus
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("pos.searchPlaceholder")}
            aria-label={t("pos.searchLabel")}
            className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searching ? (
            <Loader2
              className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
              aria-label={t("filters.searching")}
            />
          ) : (
            term !== "" && (
              <button
                type="button"
                onClick={() => {
                  handleChange("");
                  inputRef.current?.focus();
                }}
                aria-label={t("common.close")}
                className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )
          )}
        </div>

        {failed && (
          <Alert tone="error">
            {t("pos.searchFailed")}
          </Alert>
        )}

        {sellableRows.length > 0 && (
          <p className="text-xs text-muted">
            {quantity > 1 ? t("pos.keysWithQty", { count: quantity }) : t("pos.keys")}
          </p>
        )}

        {status === "done" && results.length === 0 && (
          <p className="rounded-lg bg-background p-4 text-sm text-muted">
            {t("pos.nothingFound", { query })}
          </p>
        )}

        <ul className="divide-y divide-border">
          {results.map((item) => {
            const stock = item.stock ?? 0;
            const priced = item.units.length > 0;
            const sellable = priced && stock > 0;
            const added = justAdded?.id === item.id;
            return (
              // Re-keying on the nonce remounts the row, which restarts the
              // flash when the same item is added twice in a row.
              <li
                key={added ? `${item.id}-${justAdded.nonce}` : item.id}
                className={cn(
                  "relative rounded-lg px-1 py-3",
                  added && "animate-add-flash",
                  current?.id === item.id && "bg-primary/5 ring-1 ring-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted">
                      {item.dosageForm}
                      {item.generic ? ` · ${item.generic}` : ""}
                      {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {!priced ? (
                      <Badge tone="warning">{t("pos.noPrice")}</Badge>
                    ) : stock === 0 ? (
                      <Badge tone="danger">{t("stock.outOfStock")}</Badge>
                    ) : (
                      <p className="text-xs text-muted">
                        {stock} {item.baseUnit} {t("pos.inStock")}
                      </p>
                    )}
                  </div>
                </div>

                {sellable && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.units.map((unit) => {
                      const enough = stock >= unit.qtyInBase;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            if (!enough) return;
                            onSelect(item, unit, quantity);
                            handleChange("");
                            inputRef.current?.focus();
                          }}
                          disabled={!enough}
                          title={enough ? undefined : t("pos.notEnoughFor", { unit: unit.name })}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                            enough
                              ? "cursor-pointer border-border bg-surface hover:border-primary hover:bg-primary/5 active:bg-primary/10"
                              : "cursor-not-allowed border-border opacity-50",
                            unit.isDefault && enough && "border-primary/60",
                            current?.id === item.id && currentUnit?.id === unit.id && "border-primary bg-primary/10",
                          )}
                        >
                          <span className="font-medium">{unit.name}</span>
                          {unit.qtyInBase > 1 && (
                            <span className="text-muted">×{unit.qtyInBase}</span>
                          )}
                          <span className="tabular-nums">{formatCurrency(unit.price)}</span>
                          {unit.nextPrice && (
                            <span className="tabular-nums text-warning">→ {formatCurrency(unit.nextPrice.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {sellable && item.units.some((u) => u.nextPrice) && (
                  <p className="mt-1 text-xs text-warning">
                    {t("pos.nextPriceHint", {
                      count: item.units.find((u) => u.nextPrice)!.nextPrice!.oldStockLeft,
                      unit: item.baseUnit,
                    })}
                  </p>
                )}

                {added && (
                  <span
                    aria-hidden
                    className="animate-added-badge pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm"
                  >
                    <Check className="mr-0.5 inline h-3 w-3" aria-hidden />
                    {t("pos.added")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
