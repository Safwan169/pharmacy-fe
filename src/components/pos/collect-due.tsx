"use client";

import { useEffect, useState } from "react";
import { HandCoins, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal";
import { PaymentForm } from "@/components/customers/customer-forms";
import { CustomerPicker } from "./payment-panel";
import type { Customer } from "@/types";
import { useT } from "@/i18n/client";

/**
 * Someone walks in owing money and hands over what they can.
 *
 * It was always possible — Customers, search, open them, take the payment —
 * but that is leaving the counter with people still at it, four screens deep,
 * for the second most common thing that happens at a till. Here the customer
 * is found the same way a bill on account finds them, and the form is the
 * same one their page uses, so the receipt and the ledger are identical.
 */
export function CollectDue({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const t = useT();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ModalShell label={t("due.receivePayment")} onDismiss={onClose}>
      <Card className="w-full max-w-md">
        <CardHeader
          title={t("due.receivePayment")}
          description={customer === null ? t("collectDue.findHint") : undefined}
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
          <CustomerPicker value={customer} onChange={(c) => setCustomer(c ?? null)} />

          {customer !== null &&
            (customer.dueBalance > 0 ? (
              <PaymentForm
                customerId={customer.id}
                dueBalance={customer.dueBalance}
                onDone={onClose}
              />
            ) : (
              // Worth saying rather than showing an amount box that can only
              // be refused: a customer with nothing owing is usually the
              // wrong customer, two people of the same name.
              <p className="rounded-lg bg-background p-3 text-sm text-muted">
                {t("collectDue.nothingOwed", { name: customer.name })}
              </p>
            ))}
        </CardBody>
      </Card>
    </ModalShell>
  );
}

/** The button that opens it, for the counter's own row of actions. */
export function CollectDueButton({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
    >
      <HandCoins className="h-3.5 w-3.5" aria-hidden />
      {t("collectDue.button")}
    </button>
  );
}
