import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeTranslate, type Locale, type Translate } from "./index";

/** The language chosen on this device; English until someone switches. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<Translate> {
  return makeTranslate(await getLocale());
}
