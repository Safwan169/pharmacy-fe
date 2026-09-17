"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import type { ShopSettings } from "@/types";

const initial: SettingsState = { status: "idle" };

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  const [preview, setPreview] = useState(settings);

  function set<K extends keyof ShopSettings>(key: K, value: string) {
    setPreview((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form action={action} className="space-y-4 lg:col-span-2" noValidate>
        {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
        {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" htmlFor="shop_name" required>
            <Input id="shop_name" name="shop_name" defaultValue={settings.shop_name} maxLength={100} onChange={(e) => set("shop_name", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="shop_phone">
            <Input id="shop_phone" name="shop_phone" defaultValue={settings.shop_phone} maxLength={30} onChange={(e) => set("shop_phone", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="shop_address">
              <Input id="shop_address" name="shop_address" defaultValue={settings.shop_address} maxLength={255} onChange={(e) => set("shop_address", e.target.value)} />
            </Field>
          </div>
          <Field label="Drug licence number" htmlFor="drug_license_no">
            <Input id="drug_license_no" name="drug_license_no" defaultValue={settings.drug_license_no} maxLength={50} onChange={(e) => set("drug_license_no", e.target.value)} />
          </Field>
          <Field label="Receipt paper" htmlFor="receipt_width_mm">
            <Select id="receipt_width_mm" name="receipt_width_mm" defaultValue={settings.receipt_width_mm} onChange={(e) => set("receipt_width_mm", e.target.value)}>
              <option value="80">80 mm</option>
              <option value="58">58 mm</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Receipt footer" htmlFor="receipt_footer" hint="One line at the bottom of every receipt.">
              <Input id="receipt_footer" name="receipt_footer" defaultValue={settings.receipt_footer} maxLength={255} onChange={(e) => set("receipt_footer", e.target.value)} />
            </Field>
          </div>
          <Field label="Low-stock warning below" htmlFor="low_stock_threshold" hint="In base units (tablets, bottles…). Leave blank for the default.">
            <Input id="low_stock_threshold" name="low_stock_threshold" inputMode="numeric" defaultValue={settings.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} />
          </Field>
        </div>

        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Receipt preview</p>
        <div
          className="mx-auto rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-tight text-black shadow-sm"
          style={{ width: preview.receipt_width_mm === "58" ? 190 : 260 }}
        >
          <p className="text-center text-sm font-bold">{preview.shop_name || "Pharmacy"}</p>
          {preview.shop_address && <p className="text-center">{preview.shop_address}</p>}
          {preview.shop_phone && <p className="text-center">Phone: {preview.shop_phone}</p>}
          {preview.drug_license_no && <p className="text-center">Drug Licence: {preview.drug_license_no}</p>}
          <p className="my-1 border-t border-dashed border-black" />
          <p>Invoice ······ INV-20260917-0007</p>
          <p>Napa 500 mg</p>
          <p>2 strip x 12.00 ········ 24.00</p>
          <p className="my-1 border-t border-dashed border-black" />
          <p className="font-bold">TOTAL ·············· Tk 24.00</p>
          <p className="my-1 border-t border-dashed border-black" />
          {preview.receipt_footer && <p className="text-center">{preview.receipt_footer}</p>}
        </div>
      </div>
    </div>
  );
}
