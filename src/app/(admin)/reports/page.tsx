import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Boxes, CalendarClock, Tag, Warehouse } from "lucide-react";
import { getStockValue } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireOwner();
  let value;
  try {
    value = await getStockValue();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>;
  }

  return (
    <>
      <PageHeader title="Reports" description="What the shelf is worth right now." />
      <ReportsNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock at cost" value={formatCurrency(value.value_at_cost)} hint="Unexpired batches with a recorded cost" icon={Warehouse} />
        <StatCard label="Stock at selling price" value={formatCurrency(value.value_at_price)} hint="At each medicine's default unit price" icon={Tag} />
        <StatCard label="Expired stock, at cost" value={formatCurrency(value.expired_value_at_cost)} hint="Write these off under Stock → Expiry" icon={CalendarClock} tone={value.expired_value_at_cost > 0 ? "danger" : "default"} />
        <StatCard label="Batches on the shelf" value={formatNumber(value.batches_in_stock)} hint={`${formatNumber(value.variants_in_stock)} different medicines`} icon={Boxes} />
      </div>

      {value.uncosted_units > 0 && (
        <Alert tone="warning" className="mt-5">
          {formatNumber(value.uncosted_units)} units on the shelf have no cost recorded (stock counted by hand, or carried over from before batches). They are left out of the cost figures.
        </Alert>
      )}

      <Card className="mt-5">
        <CardHeader title="Other reports" />
        <CardBody className="flex flex-wrap gap-4 text-sm">
          <Link href="/reports/daily-closing" className="text-primary hover:underline">Daily closing — cash in drawer, takings by method</Link>
          <Link href="/reports/profit" className="text-primary hover:underline">Profit — revenue less cost of goods, by day and by medicine</Link>
          <Link href="/customers/due" className="text-primary hover:underline">Who owes money</Link>
          <Link href="/stock/expiring" className="text-primary hover:underline">Expiry</Link>
        </CardBody>
      </Card>
    </>
  );
}
