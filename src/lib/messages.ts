import type { CheckoutFailureReason, CheckoutItemFailure } from "@/types";

/**
 * Turns API errors into sentences a non-technical shop assistant can act on.
 *
 * NestJS speaks in validator-ese — "price must not be greater than 99999999.99",
 * "property foo should not exist", "Unauthorized". None of that tells the person
 * at the counter what to do next, so nothing raw is ever shown. Anything we
 * can't recognise falls back to a calm, generic line rather than leaking
 * internals.
 */

const STATUS_FALLBACKS: Record<number, string> = {
  0: "Could not reach the server. Check that the API is running and try again.",
  400: "Some of the details entered aren't quite right. Please review and try again.",
  401: "Your session has ended. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for. It may have been removed.",
  409: "That change conflicts with something already saved. Refresh and try again.",
  413: "That file is too large. The limit is 25 MB.",
  422: "This couldn't be completed. Please check the details below.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on the server. Please try again in a moment.",
  502: "The server isn't responding right now. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

/**
 * Validator strings we recognise, mapped to plain English. Matched on a
 * distinctive fragment because NestJS interpolates field names and limits into
 * the middle of each message.
 */
const VALIDATION_PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /email must be an email/i,
    message: "Enter a valid email address, like name@pharmacy.com.",
  },
  {
    test: /password should not be empty/i,
    message: "Enter your password.",
  },
  {
    test: /price.*maxDecimalPlaces|maxDecimalPlaces.*price/i,
    message: "Price can have at most 2 decimal places — for example 40.50.",
  },
  {
    test: /price must not be greater than/i,
    message: "That price is too high. Enter an amount below 99,999,999.99.",
  },
  {
    test: /price must not be less than 0|price.*must not be less than/i,
    message: "Price can't be negative. Enter 0 or more.",
  },
  {
    test: /stock_quantity must be an integer/i,
    message: "Stock must be a whole number of units — no decimals.",
  },
  {
    test: /stock_quantity must not be less than 0/i,
    message: "Stock can't be negative. Enter 0 if the item is out of stock.",
  },
  {
    test: /at least one of price or stock_quantity/i,
    message: "Enter a price or a stock quantity before saving.",
  },
  {
    test: /quantity must not be less than 1/i,
    message: "Quantity must be at least 1.",
  },
  {
    test: /discount\.value.*between 0 and 100/i,
    message: "A percentage discount must be between 0 and 100.",
  },
  {
    test: /discount\.value.*at least 0/i,
    message: "A discount can't be negative.",
  },
  {
    test: /items should not be empty|items must contain at least/i,
    message: "Add at least one item before completing the sale.",
  },
  {
    test: /from must be a bare|to must be a bare/i,
    message: "Choose a date in day/month/year form.",
  },
  {
    test: /from must be a real calendar date|to must be a real calendar date/i,
    message: "That date doesn't exist on the calendar. Please pick another.",
  },
  {
    test: /from.*after.*to|to.*before.*from|from must be on or before/i,
    message: "The start date must come before the end date.",
  },
  {
    test: /both from and to|must be sent together/i,
    message: "Choose both a start date and an end date.",
  },
  {
    test: /should not exist/i,
    message: "That filter isn't recognised. Try clearing it and searching again.",
  },
  {
    test: /must be a number conforming|must be a number string|must be an integer/i,
    message: "Enter numbers only in that field.",
  },
  {
    test: /file.*required|expected.*file/i,
    message: "Choose a CSV file to upload.",
  },
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
export function humaniseApiMessage(status: number, payload: unknown): string {
  const raw = extractRawMessages(payload);

  for (const line of raw) {
    for (const { test, message } of VALIDATION_PATTERNS) {
      if (test.test(line)) return message;
    }
  }

  // A 401 on the login screen means bad credentials, not an expired session.
  if (status === 401 && raw.some((l) => /invalid credentials/i.test(l))) {
    return "That email and password don't match. Please try again.";
  }

  if (STATUS_FALLBACKS[status]) return STATUS_FALLBACKS[status];

  return "Something went wrong. Please try again.";
}

/**
 * Checkout rejections, in the shop assistant's language.
 *
 * The API returns a per-line reason so the counter staff can fix the basket
 * without a second lookup — each of these says what happened AND what to do.
 */
export function humaniseCheckoutFailure(
  failure: CheckoutItemFailure,
  itemName?: string,
): string {
  const name = itemName ?? `Item #${failure.variant_id}`;

  const messages: Record<CheckoutFailureReason, string> = {
    not_found: `${name} is no longer in the catalogue. Remove it from the basket.`,
    inactive: `${name} has been withdrawn from sale. Remove it from the basket.`,
    not_priced: `${name} doesn't have a price for that unit yet, so it can't be sold. Set a price first.`,
    unit_not_found: `${name} is no longer sold in that unit. Remove it and add it again.`,
    unit_not_sellable: `${name} isn't sold in that unit. Remove it and pick a different unit.`,
    insufficient_stock:
      failure.available_quantity === 0
        ? `Not enough ${name} in stock for even one of that unit. Try a smaller unit, or remove it.`
        : `Only ${failure.available_quantity} of ${name} left in that unit — you asked for ${failure.requested_quantity}. Lower the quantity.`,
    expired_only: `The only ${name} left in stock has expired and can't be sold. Remove it from the basket and write off the expired batch.`,
    duplicate_item: `${name} is in the basket twice. Combine it into one line with the total quantity.`,
    stock_changed: `${name} was sold to someone else while you were checking out. Nothing was charged — please try again.`,
  };

  return messages[failure.reason] ?? failure.message;
}

/** One summary line above the per-item detail, so the outcome is unmistakable. */
export function checkoutRejectionSummary(count: number): string {
  return count === 1
    ? "The sale was not completed. One item needs your attention — nothing was charged and no stock was taken."
    : `The sale was not completed. ${count} items need your attention — nothing was charged and no stock was taken.`;
}
