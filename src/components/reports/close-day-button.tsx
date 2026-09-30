"use client";

import { useEffect, useState } from "react";
import { Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal";
import { DayCloseForm } from "./day-close-form";
import type { DayClosingSummary } from "@/types";
import { useT } from "@/i18n/client";

/**
 * Counting the drawer without leaving the dashboard.
 *
 * The count is a one-minute job at the end of a shift, and sending someone
 * to another screen for it — past the takings breakdown, the cashier split
 * and the top sellers — is most of the reason it goes undone. The form is
 * the same one the closing page uses, so what is recorded is identical; the
 * page is still there for anyone who wants the working out with it.
 */
export function CloseDayButton({
  date,
  expected,
  closing,
}: {
  date: string;
  expected: number;
  closing: DayClosingSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" variant={closing ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4" aria-hidden />
        {closing ? t("closeDay.seeCount") : t("closeDay.submit")}
      </Button>

      {open && (
        <ModalShell label={t("closeDay.title")} onDismiss={() => setOpen(false)}>
          <Card className="w-full max-w-md">
            <CardHeader
              title={t("closeDay.title")}
              description={t("closeDay.description")}
              action={
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                  className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              }
            />
            <CardBody>
              <DayCloseForm date={date} expected={expected} closing={closing} />
            </CardBody>
          </Card>
        </ModalShell>
      )}
    </>
  );
}
