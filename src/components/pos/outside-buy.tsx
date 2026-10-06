"use client";

import { useEffect, useState, useTransition } from "react";
import { PackagePlus, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SupplierPicker } from "@/components/stock/supplier-picker";
import {
  buyInForCounter,
  searchOutside,
  type CounterSearchResult,
} from "@/lib/actions/search";
import { formatCurrency } from "@/lib/utils";
import type { Supplier } from "@/types";
import { useT } from "@/i18n/client";

/**
 * Selling a medicine borrowed from the shop next door, without leaving the
 * counter.
 *
 * It happens constantly: a customer asks for something this shop is out of,
 * someone walks round and fetches it. Doing that honestly meant Stock →
 * receive → find the medicine → price it → back to the counter → search
 * again, with the customer standing there, so in practice it was done off the
 * books. One dialog here writes the same delivery: a batch with what the other
 * shop charges, the amount on their account, and the medicine in the basket.
 */
export function OutsideMatches({
  query,
  auto,
  onAdded,
}: {
  query: string;
  /** Nothing sellable matched, so the alternatives are worth showing unasked. */
  auto: boolean;
  onAdded: (item: CounterSearchResult) => void;
}) {
  const t = useT();
  const [items, setItems] = useState<CounterSearchResult[] | null>(null);
  /** The cashier pressed the link; with nothing sellable we don't wait to be asked. */
  const [asked, setAsked] = useState(false);
  const [picked, setPicked] = useState<CounterSearchResult | null>(null);
  const [lastQuery, setLastQuery] = useState(query);

  // A fresh search invalidates whatever was listed for the previous one.
  if (lastQuery !== query) {
    setLastQuery(query);
    setItems(null);
    setAsked(false);
    setPicked(null);
  }

  const wanted = auto || asked;

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    searchOutside(query)
      .then((found) => live && setItems(found))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [wanted, query]);

  if (!wanted) {
    return (
      <button
        type="button"
        onClick={() => setAsked(true)}
        className="text-xs font-medium text-primary hover:underline"
      >
        {t("pos.outsideShow")}
      </button>
    );
  }

  if (items === null || items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <div>
        <p className="text-sm font-medium">{t("pos.outsideTitle")}</p>
        <p className="text-xs text-muted">{t("pos.outsideHint")}</p>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm">{item.name}</p>
              <p className="truncate text-xs text-muted">
                {item.dosageForm}
                {item.manufacturer ? ` · ${item.manufacturer}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPicked(item)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5"
            >
              <PackagePlus className="h-3.5 w-3.5" aria-hidden />
              {t("pos.outsideButton")}
            </button>
          </li>
        ))}
      </ul>

      {picked !== null && (
        <OutsideBuyDialog
          item={picked}
          onClose={() => setPicked(null)}
          onDone={(fresh) => {
            setPicked(null);
            onAdded(fresh);
          }}
        />
      )}
    </div>
  );
}

function OutsideBuyDialog({
  item,
  onClose,
  onDone,
}: {
  item: CounterSearchResult;
  onClose: () => void;
  onDone: (item: CounterSearchResult) => void;
}) {
  const t = useT();
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState(item.price === null ? "" : String(item.price));
  const [shop, setShop] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saving, start] = useTransition();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const count = Number(quantity);
  const each = Number(cost);
  const sell = Number(price);
  const owed = Number.isFinite(count * each) ? count * each : 0;

  function submit() {
    if (!Number.isInteger(count) || count < 1) return setError(t("pos.outsideQtyInvalid"));
    if (!Number.isFinite(each) || each < 0 || cost === "") return setError(t("pos.outsideCostInvalid"));
    if (!Number.isFinite(sell) || sell <= 0 || price === "") return setError(t("pos.outsidePriceInvalid"));
    if (shop === null) return setError(t("pos.outsideShopRequired"));
    setError(undefined);
    start(async () => {
      const result = await buyInForCounter({
        variantId: item.id,
        quantity: count,
        cost: each,
        price: sell,
        supplierId: shop.id,
      });
      if (result.status === "ok") onDone(result.item);
      else setError(result.message);
    });
  }

  return (
    <ModalShell label={t("pos.outsideTitle")} onDismiss={onClose}>
      <Card className="w-full max-w-md">
        <CardHeader
          title={t("pos.outsideButton")}
          description={`${item.name} · ${item.dosageForm}`}
          action={
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        />
        <CardBody className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("pos.outsideQty", { unit: item.baseUnit })}>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label={t("pos.outsideCost")}>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </Field>
            <Field label={t("pos.outsidePrice")}>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>

          <SupplierPicker value={shop} onChange={setShop} />

          {owed > 0 && shop !== null && (
            <p className="rounded-lg bg-background p-3 text-xs text-muted">
              {t("pos.outsideOwed", { amount: formatCurrency(owed), name: shop.name })}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? t("pos.outsideSaving") : t("pos.outsideSave")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </ModalShell>
  );
}
