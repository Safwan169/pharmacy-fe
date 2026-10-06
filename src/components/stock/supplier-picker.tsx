"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { quickAddSupplier, searchSuppliers } from "@/lib/actions/stock";
import type { Supplier } from "@/types";
import { useT } from "@/i18n/client";

/**
 * Find a supplier by name, or add one without leaving the form.
 *
 * Shared by the delivery form and the counter, where a medicine fetched from
 * the shop next door is taken in on that shop's account — so the same list,
 * and the same way of adding a shop nobody has dealt with before.
 */
export function SupplierPicker({
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
