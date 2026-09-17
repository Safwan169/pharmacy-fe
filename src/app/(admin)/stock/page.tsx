import { redirect } from "next/navigation";

/** The Stock section's landing page. Grows a menu in the next step; for now, expiry is the one screen. */
export default function StockPage() {
  redirect("/stock/expiring");
}
