import { redirect } from "next/navigation";

/** The Stock section opens on receiving, the thing done most often. */
export default function StockPage() {
  redirect("/stock/receive");
}
