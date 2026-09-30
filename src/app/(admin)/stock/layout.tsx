/**
 * Stock is no longer the owner's alone. Deliveries arrive when they arrive,
 * often with nobody but the cashier in the shop, and stock that sits in a box
 * because the only person allowed to enter it has gone home is worse than
 * stock counted by whoever was there. Paying the supplier is the part that
 * stays with the owner, and the API refuses it rather than this screen hiding
 * it. Pages that are the owner's — the movement ledger, write-offs — say so
 * themselves.
 */
export default function StockLayout({ children }: LayoutProps<"/stock">) {
  return <>{children}</>;
}
