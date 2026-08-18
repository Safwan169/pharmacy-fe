import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { medicines, sales } from "@/lib/mock-data";
import { getInventoryValue } from "@/lib/inventory";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cost = getInventoryValue(medicines);

  return (
    <>
      <PageHeader title="Reports" description="Sales and inventory summaries." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sales summary" />
          <CardBody className="space-y-3 text-sm">
            <Row label="Invoices" value={String(sales.length)} />
            <Row label="Gross revenue" value={formatCurrency(revenue)} />
            <Row
              label="Average invoice"
              value={formatCurrency(sales.length ? revenue / sales.length : 0)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Inventory summary" />
          <CardBody className="space-y-3 text-sm">
            <Row label="Distinct items" value={String(medicines.length)} />
            <Row
              label="Units on hand"
              value={String(medicines.reduce((s, m) => s + m.quantity, 0))}
            />
            <Row label="Stock value (at cost)" value={formatCurrency(cost)} />
          </CardBody>
        </Card>
      </div>

      <p className="mt-5 text-xs text-muted">
        Charts and date-range filtering land here once the reporting API is wired up.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
