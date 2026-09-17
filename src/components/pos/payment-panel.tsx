"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Banknote, Plus, Smartphone, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { quickAddCustomer, searchCustomers } from "@/lib/actions/customers";
import { cn, formatCurrency } from "@/lib/utils";
import type { Customer, PaymentMethod } from "@/types";

export interface PaymentChoice {
  method: PaymentMethod;
  amountTendered?: number;
  bkashTrxId?: string;
  customer?: Customer;
}

/**
 * The three ways to pay. Cash shows change; bKash takes the TrxID; Due needs
 * a customer, found by phone/name or added on the spot. The parent reads the
 * choice and decides whether the sale can be submitted.
 */
export function PaymentPanel({
  total,
  value,
  onChange,
}: {
  total: number;
  value: PaymentChoice;
  onChange: (next: PaymentChoice) => void;
}) {
  const [tendered, setTendered] = useState("");
  const [trx, setTrx] = useState("");

  function pick(method: PaymentMethod) {
    onChange({ method, customer: method === "due" ? value.customer : undefined });
  }

  useEffect(() => {
    if (value.method !== "cash") return;
    const n = Number(tendered);
    onChange({ ...value, amountTendered: tendered && !Number.isNaN(n) ? n : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tendered]);

  useEffect(() => {
    if (value.method !== "bkash") return;
    onChange({ ...value, bkashTrxId: trx.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trx]);

  const tenderedNum = Number(tendered);
  const change = tendered && !Number.isNaN(tenderedNum) ? tenderedNum - total : null;
  const quick = suggestNotes(total);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">How are they paying?</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
        <MethodButton active={value.method === "cash"} onClick={() => pick("cash")} icon={Banknote} label="Cash" />
        <MethodButton active={value.method === "bkash"} onClick={() => pick("bkash")} icon={Smartphone} label="bKash" />
        <MethodButton active={value.method === "due"} onClick={() => pick("due")} icon={UserRound} label="Due" />
      </div>

      {value.method === "cash" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="tendered" className="w-24 shrink-0 text-xs text-muted">
              Cash given
            </label>
            <Input
              id="tendered"
              inputMode="decimal"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder={formatCurrency(total)}
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTendered(String(n))}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs tabular-nums hover:border-primary"
              >
                {n}
              </button>
            ))}
          </div>
          {change !== null && (
            <p className={cn("text-sm", change < 0 ? "text-danger" : "text-success")}>
              {change < 0
                ? `Short by ${formatCurrency(-change)}`
                : `Change to give back: ${formatCurrency(change)}`}
            </p>
          )}
        </div>
      )}

      {value.method === "bkash" && (
        <div className="flex items-center gap-2">
          <label htmlFor="trx" className="w-24 shrink-0 text-xs text-muted">
            TrxID
          </label>
          <Input id="trx" value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} placeholder="Optional" maxLength={30} className="font-mono uppercase" />
        </div>
      )}

      {value.method === "due" && (
        <CustomerPicker value={value.customer ?? null} onChange={(customer) => onChange({ ...value, customer })} />
      )}
    </div>
  );
}

function MethodButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Banknote;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/** Nearest sensible banknotes above the total, for one-tap "cash given". */
function suggestNotes(total: number): number[] {
  const notes = [50, 100, 200, 500, 1000, 2000, 5000];
  const out = new Set<number>();
  const exact = Math.ceil(total);
  if (exact > 0) out.add(exact);
  for (const n of notes) {
    if (n >= total) out.add(n);
    if (out.size >= 4) break;
  }
  const nextHundred = Math.ceil(total / 100) * 100;
  if (nextHundred > total) out.add(nextHundred);
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (c: Customer | undefined) => void }) {
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const found = await searchCustomers(term);
      if (id === requestId.current) setOptions(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{value.name}</span>
          {value.phone && <span className="ml-2 text-muted">{value.phone}</span>}
          {value.dueBalance > 0 && (
            <span className="ml-2 text-xs text-warning">already owes {formatCurrency(value.dueBalance)}</span>
          )}
        </span>
        <button type="button" onClick={() => onChange(undefined)} className="text-xs text-primary hover:underline">
          Change
        </button>
      </div>
    );
  }

  if (adding) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium">New customer</p>
        <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} autoFocus />
        <Input placeholder="Phone" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} maxLength={20} />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() =>
              start(async () => {
                const r = await quickAddCustomer(newName, newPhone);
                if (r.customer) {
                  onChange(r.customer);
                  setAdding(false);
                  setError(undefined);
                } else setError(r.error);
              })
            }
            className="h-9 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="h-9 px-3 text-xs text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder="Customer phone or name…"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoFocus
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-md">
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background"
              >
                <span>
                  {c.name}
                  {c.phone && <span className="ml-2 text-xs text-muted">{c.phone}</span>}
                </span>
                {c.dueBalance > 0 && <span className="text-xs text-warning">{formatCurrency(c.dueBalance)} due</span>}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const digits = term.replace(/\D/g, "");
                setNewName(digits.length >= 6 ? "" : term);
                setNewPhone(digits.length >= 6 ? term : "");
                setAdding(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-background"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {term.trim() ? `Add “${term.trim()}” as a new customer` : "Add a new customer"}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
