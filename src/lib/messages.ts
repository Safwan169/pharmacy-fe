import type { CheckoutFailureReason, CheckoutItemFailure } from "@/types";
import type { MessageKey, Translate } from "@/i18n";

/**
 * Turns API errors into sentences a non-technical shop assistant can act on,
 * in whichever language they chose.
 *
 * NestJS speaks in validator-ese — "price must not be greater than 99999999.99",
 * "property foo should not exist", "Unauthorized". None of that tells the person
 * at the counter what to do next, so nothing raw is ever shown. Anything we
 * can't recognise falls back to a calm, generic line rather than leaking
 * internals.
 */

const STATUS_FALLBACKS: Record<number, MessageKey> = {
  0: "api.unreachable",
  400: "api.400",
  401: "api.401",
  403: "api.403",
  404: "api.404",
  409: "api.409",
  413: "api.413",
  422: "api.422",
  429: "api.429",
  500: "api.500",
  502: "api.502",
  503: "api.503",
};

/**
 * Validator strings we recognise, mapped to a message key. Matched on a
 * distinctive fragment because NestJS interpolates field names and limits into
 * the middle of each message.
 */
const VALIDATION_PATTERNS: { test: RegExp; key: MessageKey }[] = [
  { test: /email must be an email/i, key: "api.email" },
  { test: /password should not be empty/i, key: "api.passwordEmpty" },
  { test: /price.*maxDecimalPlaces|maxDecimalPlaces.*price/i, key: "api.priceDecimals" },
  { test: /price must not be greater than/i, key: "api.priceTooHigh" },
  { test: /price must not be less than 0|price.*must not be less than/i, key: "api.priceNegative" },
  { test: /stock_quantity must be an integer/i, key: "api.stockInteger" },
  { test: /stock_quantity must not be less than 0/i, key: "api.stockNegative" },
  { test: /at least one of price or stock_quantity/i, key: "api.priceOrStock" },
  { test: /quantity must not be less than 1/i, key: "api.quantityMin" },
  { test: /discount\.value.*between 0 and 100/i, key: "api.discountRange" },
  { test: /discount\.value.*at least 0/i, key: "api.discountNegative" },
  { test: /items should not be empty|items must contain at least/i, key: "api.itemsEmpty" },
  { test: /from must be a bare|to must be a bare/i, key: "api.dateFormat" },
  { test: /from must be a real calendar date|to must be a real calendar date/i, key: "api.dateInvalid" },
  { test: /from.*after.*to|to.*before.*from|from must be on or before/i, key: "api.dateOrder" },
  { test: /both from and to|must be sent together/i, key: "api.dateBoth" },
  { test: /should not exist/i, key: "api.unknownFilter" },
  { test: /must be a number conforming|must be a number string|must be an integer/i, key: "api.numbersOnly" },
  { test: /file.*required|expected.*file/i, key: "api.fileRequired" },
];

/** Reads the `message` field NestJS puts on an error body, in any of its shapes. */
function extractRawMessages(payload: unknown): string[] {
  if (typeof payload === "string") return [payload];
  if (payload === null || typeof payload !== "object") return [];

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string") return [message];
  if (Array.isArray(message)) {
    return message.filter((m): m is string => typeof m === "string");
  }
  return [];
}

/**
 * The public entry point used by the API client. Prefers a recognised
 * translation, then a status-based fallback, then a last-resort sentence.
 */
export function humaniseApiMessage(status: number, payload: unknown, t: Translate): string {
  const raw = extractRawMessages(payload);

  for (const line of raw) {
    for (const { test, key } of VALIDATION_PATTERNS) {
      if (test.test(line)) return t(key);
    }
  }

  // A 401 on the login screen means bad credentials, not an expired session.
  if (status === 401 && raw.some((l) => /invalid credentials/i.test(l))) {
    return t("api.badCredentials");
  }

  if (STATUS_FALLBACKS[status]) return t(STATUS_FALLBACKS[status]);

  return t("api.generic");
}

/**
 * Checkout rejections, in the shop assistant's language.
 *
 * The API returns a per-line reason so the counter staff can fix the basket
 * without a second lookup — each of these says what happened AND what to do.
 */
export function humaniseCheckoutFailure(
  failure: CheckoutItemFailure,
  t: Translate,
  itemName?: string,
): string {
  const name = itemName ?? `#${failure.variant_id}`;

  const keys: Record<CheckoutFailureReason, MessageKey> = {
    not_found: "checkout.not_found",
    inactive: "checkout.inactive",
    not_priced: "checkout.not_priced",
    unit_not_found: "checkout.unit_not_found",
    unit_not_sellable: "checkout.unit_not_sellable",
    insufficient_stock:
      failure.available_quantity === 0 ? "checkout.insufficient_none" : "checkout.insufficient_some",
    expired_only: "checkout.expired_only",
    duplicate_item: "checkout.duplicate_item",
    stock_changed: "checkout.stock_changed",
  };

  const key = keys[failure.reason];
  if (!key) return failure.message;
  return t(key, {
    name,
    available: failure.available_quantity ?? 0,
    requested: failure.requested_quantity ?? 0,
  });
}

/** One summary line above the per-item detail, so the outcome is unmistakable. */
export function checkoutRejectionSummary(count: number, t: Translate): string {
  return count === 1 ? t("checkout.summaryOne") : t("checkout.summaryMany", { count });
}

/** Zod issues carry a message key; this turns one into text (or leaves it out). */
export function issueText(t: Translate, message: string | undefined): string | undefined {
  return message === undefined ? undefined : t(message as MessageKey);
}
