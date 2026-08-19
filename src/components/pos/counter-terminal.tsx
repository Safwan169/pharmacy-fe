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
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  CircleAlert,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { searchForCounter, type CounterSearchResult } from "@/lib/actions/search";
import { checkout, type CheckoutResult } from "@/lib/actions/checkout";
import { formatCurrency, cn } from "@/lib/utils";
import type { DiscountType, Sale } from "@/types";
import { SaleReceipt } from "./sale-receipt";

interface BasketLine {
  variantId: number;
  name: string;
  dosageForm: string;
  unitPrice: number;
  /** Stock at the time it was added — a guard rail, not the final word. */
  stockAtAdd: number;
  quantity: number;
}

export function CounterTerminal() {
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const [submitting, startCheckout] = useTransition();
  // The variant that was just added, plus a counter so adding the same item
  // twice in a row restarts the animation instead of being a no-op.
  const [justAdded, setJustAdded] = useState<{ id: number; nonce: number } | null>(
    null,
  );
  const addNonce = useRef(0);

  const problemIds = useMemo(
    () =>
      result?.status === "rejected"
        ? new Set(result.problems.map((p) => p.variantId))
        : new Set<number>(),
    [result],
  );

  const addItem = useCallback((item: CounterSearchResult) => {
    // Adding the same item twice must merge into one line: the API rejects a
    // basket that lists a variant more than once.
    setBasket((current) => {
      const existing = current.find((line) => line.variantId === item.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          variantId: item.id,
          name: item.name,
          dosageForm: item.dosageForm,
          unitPrice: item.price ?? 0,
          stockAtAdd: item.stock ?? 0,
          quantity: 1,
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

  const subtotal = basket.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

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
    if (Number.isNaN(parsedDiscount)) return "Enter the discount using numbers only.";
    if (parsedDiscount < 0) return "A discount can't be negative.";
    if (discountType === "percentage" && parsedDiscount > 100) {
      return "A percentage discount can't be more than 100%.";
    }
    return undefined;
  })();

  function submit() {
    if (basket.length === 0 || discountError) return;

    startCheckout(async () => {
      const response = await checkout({
        items: basket.map((line) => ({
          variant_id: line.variantId,
          quantity: line.quantity,
          name: line.name,
        })),
        discount:
          discountAmount > 0 && !Number.isNaN(parsedDiscount)
            ? { type: discountType, value: parsedDiscount }
            : undefined,
      });

      setResult(response);
      if (response.status === "success") {
        setCompleted(response.sale);
        setBasket([]);
        setDiscountValue("");
      }
    });
  }

  if (completed) {
    return (
      <SaleReceipt
        sale={completed}
        onNewSale={() => {
          setCompleted(null);
          setResult(null);
        }}
      />
    );
  }

  const addedLine = justAdded
    ? basket.find((line) => line.variantId === justAdded.id)
    : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* The flash and the badge are visual only; this is what a screen
          reader hears when something lands in the basket. */}
      <p aria-live="polite" className="sr-only">
        {addedLine
          ? `${addedLine.name} added to the basket. ${addedLine.quantity} in the basket.`
          : ""}
      </p>

      <div className="lg:col-span-3">
        <ItemSearch onSelect={addItem} justAdded={justAdded} />
      </div>

      <div className="lg:sticky lg:top-2 lg:col-span-2 lg:self-start">
        <Card className="max-h-[calc(100vh-6rem)] overflow-y-auto lg:max-h-[calc(100vh-7rem)]">
          <CardHeader
            title="Basket"
            description={
              basket.length === 0
                ? "Nothing added yet"
                : `${basket.length} ${basket.length === 1 ? "item" : "items"}`
            }
          />

          {result?.status === "rejected" && (
            <div className="px-5 pt-5 pb-5">
              <Alert tone="error" title="Sale not completed">
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
              title="The basket is empty"
              description="Search for a medicine on the left and select it to add it here."
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {basket.map((line) => {
                  const flagged = problemIds.has(line.variantId);
                  const added = justAdded?.id === line.variantId;
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
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {flagged && (
                              <CircleAlert
                                className="mr-1 inline h-3.5 w-3.5 text-danger"
                                aria-label="Needs attention"
                              />
                            )}
                            {line.name}
                          </p>
                          <p className="text-xs text-muted">
                            {line.dosageForm} · {formatCurrency(line.unitPrice)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(line.variantId)}
                          aria-label={`Remove ${line.name} from the basket`}
                          className="rounded-md p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                          <QuantityButton
                            label={`Reduce quantity of ${line.name}`}
                            onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </QuantityButton>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.quantity}
                            aria-label={`Quantity of ${line.name}`}
                            onChange={(e) => {
                              const next = Number(e.target.value.replace(/\D/g, ""));
                              if (next >= 1) setQuantity(line.variantId, next);
                            }}
                            className="h-7 w-12 rounded-md border border-border bg-surface text-center text-sm tabular-nums focus:border-primary focus:outline-2 focus:outline-primary/30"
                          />
                          <QuantityButton
                            label={`Increase quantity of ${line.name}`}
                            onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </QuantityButton>
                        </div>

                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(line.unitPrice * line.quantity)}
                        </span>
                      </div>

                      {line.quantity > line.stockAtAdd && (
                        <p className="mt-1.5 text-xs text-warning">
                          Only {line.stockAtAdd} were on the shelf when this was
                          added. The sale will be refused if there aren&apos;t enough.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <CardBody className="space-y-4 border-t border-border">
                <div>
                  <label
                    htmlFor="discount"
                    className="text-sm font-medium text-foreground"
                  >
                    Discount{" "}
                    <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      aria-label="Discount type"
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
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">−{formatCurrency(discountAmount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                    <dt>Total to pay</dt>
                    <dd className="tabular-nums">{formatCurrency(total)}</dd>
                  </div>
                </dl>

                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !!discountError}
                  className="h-11 w-full"
                >
                  {submitting ? "Taking payment…" : `Take payment · ${formatCurrency(total)}`}
                </Button>
               
              </CardBody>
            </>
          )}
        </Card>
      </div>
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
function ItemSearch({
  onSelect,
  justAdded,
}: {
  onSelect: (item: CounterSearchResult) => void;
  justAdded: { id: number; nonce: number } | null;
}) {
  const [term, setTerm] = useState("");
  // One object rather than three flags, so a result can never be shown next to
  // a stale "searching" spinner or a leftover error.
  const [state, setState] = useState<{
    status: "idle" | "searching" | "done" | "failed";
    results: CounterSearchResult[];
  }>({ status: "idle", results: [] });
  const requestId = useRef(0);

  function handleChange(value: string) {
    setTerm(value);
    // Clearing and the spinner both belong to the keystroke, not to an effect —
    // deriving them here keeps the effect purely about the debounced request.
    setState(
      value.trim().length < 2
        ? { status: "idle", results: [] }
        : { status: "searching", results: [] },
    );
  }

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;

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

  const query = term.trim();

  return (
    <Card>
      <CardHeader
        title="Find a medicine"
        description="Search by brand name or ingredient, then select it to add it to the basket."
      />
      <CardBody className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            autoFocus
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start typing — for example “Napa” or “Paracetamol”"
            aria-label="Search for a medicine"
            className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
          />
          {searching && (
            <Loader2
              className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
              aria-label="Searching"
            />
          )}
        </div>

        {failed && (
          <Alert tone="error">
            The search didn&apos;t work. Check your connection and try typing again.
          </Alert>
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="text-sm text-muted">Keep typing — at least 2 letters.</p>
        )}

        {status === "done" && results.length === 0 && (
          <p className="rounded-lg bg-background p-4 text-sm text-muted">
            Nothing found for “{query}”. Check the spelling, or try part of the
            name instead.
          </p>
        )}

        <ul className="divide-y divide-border">
          {results.map((item) => {
            const sellable = item.price !== null && (item.stock ?? 0) > 0;
            const added = justAdded?.id === item.id;
            return (
              // Re-keying on the nonce remounts the row, which restarts the
              // flash when the same item is added twice in a row.
              <li
                key={added ? `${item.id}-${justAdded.nonce}` : item.id}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => sellable && onSelect(item)}
                  disabled={!sellable}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-1 py-3 text-left transition-colors",
                    sellable
                      ? "cursor-pointer hover:bg-background active:bg-primary/10"
                      : "cursor-not-allowed opacity-70",
                    added && "animate-add-flash",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted">
                      {item.dosageForm}
                      {item.generic ? ` · ${item.generic}` : ""}
                      {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {item.price === null ? (
                      <Badge tone="warning">No price set</Badge>
                    ) : (item.stock ?? 0) === 0 ? (
                      <Badge tone="danger">Out of stock</Badge>
                    ) : (
                      <>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-xs text-muted">{item.stock} in stock</p>
                      </>
                    )}
                  </div>
                </button>

                {added && (
                  <span
                    aria-hidden
                    className="animate-added-badge pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm"
                  >
                    <Check className="mr-0.5 inline h-3 w-3" aria-hidden />
                    Added
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
