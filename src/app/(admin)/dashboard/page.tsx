import Link from "next/link";
import { Pill, DollarSign, TriangleAlert, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { medicines, sales, findMedicine } from "@/lib/mock-data";
import {
  getStockStatus,
  getExpiryStatus,
  getInventoryValue,
  stockLabels,
  stockTones,
} from "@/lib/inventory";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const lowStock = medicines.filter(
    (m) => getStockStatus(m) !== "in-stock",
  );
  const expiring = medicines.filter((m) => getExpiryStatus(m) !== "valid");
  const todayRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of inventory, sales and stock health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total medicines"
          value={String(medicines.length)}
          hint={`${formatCurrency(getInventoryValue(medicines))} stock value`}
          icon={Pill}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(todayRevenue)}
          hint={`${sales.length} invoices`}
          icon={DollarSign}
        />
        <StatCard
          label="Stock alerts"
          value={String(lowStock.length)}
          hint="At or below reorder level"
          icon={TriangleAlert}
          tone="warning"
        />
        <StatCard
          label="Expiry alerts"
          value={String(expiring.length)}
          hint="Expired or within 90 days"
          icon={CalendarClock}
          tone="danger"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs restocking"
            description="Items at or below their reorder level"
            action={
              <Link
                href="/alerts"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Medicine</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-right">Reorder at</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <EmptyRow colSpan={4} message="All items are above reorder level." />
              ) : (
                lowStock.map((m) => {
                  const status = getStockStatus(m);
                  return (
                    <tr key={m.id}>
                      <Td className="font-medium">{m.name}</Td>
                      <Td className="text-right tabular-nums">{m.quantity}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {m.reorderLevel}
                      </Td>
                      <Td>
                        <Badge tone={stockTones[status]}>{stockLabels[status]}</Badge>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Recent sales"
            description="Latest invoices processed"
            action={
              <Link
                href="/sales"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Item</Th>
                <Th>Date</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <Td className="font-medium">{sale.invoiceNumber}</Td>
                  <Td className="text-muted">
                    {findMedicine(sale.items[0].medicineId)?.name ?? "—"}
                    {sale.items.length > 1 && ` +${sale.items.length - 1}`}
                  </Td>
                  <Td className="text-muted">{formatDate(sale.createdAt)}</Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(sale.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
