import { en, type MessageKey } from "./en";
import { bn } from "./bn";
import type { PaymentMethod, RefundMethod, SaleStatus } from "@/types";

export type Locale = "en" | "bn";
export type { MessageKey };

export const LOCALES: Locale[] = ["en", "bn"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, bn };

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "bn";
}

/** Looks a key up and fills `{placeholders}`; falls back to English for gaps. */
export function makeTranslate(locale: Locale): Translate {
  const dict = DICTIONARIES[locale];
  return (key, vars) => {
    let text = dict[key] ?? en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.split(`{${name}}`).join(String(value));
      }
    }
    return text;
  };
}

/** Label keys for the API's enums, so a status reads the same on every screen. */
export const PAYMENT_METHOD_KEYS: Record<PaymentMethod, MessageKey> = {
  cash: "paymentMethod.cash",
  bkash: "paymentMethod.bkash",
  due: "paymentMethod.due",
};

export const SALE_STATUS_KEYS: Record<SaleStatus, MessageKey> = {
  completed: "saleStatus.completed",
  voided: "saleStatus.voided",
  returned: "saleStatus.returned",
  partial_return: "saleStatus.partial_return",
};

export const REFUND_METHOD_KEYS: Record<RefundMethod, MessageKey> = {
  cash: "refund.cash",
  bkash: "refund.bkash",
  due_adjust: "refund.due_adjust",
};
