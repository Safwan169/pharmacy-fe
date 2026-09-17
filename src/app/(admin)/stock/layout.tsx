import { requireOwner } from "@/lib/current-user";

/** Everything under /stock is the owner's: receiving, costs, history, expiry write-offs. */
export default async function StockLayout({ children }: LayoutProps<"/stock">) {
  await requireOwner();
  return <>{children}</>;
}
