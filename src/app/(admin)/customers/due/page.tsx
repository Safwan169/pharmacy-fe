import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ReceivePayment } from "@/components/customers/customer-forms";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { getDueList } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Due list" };

export default async function DuePage() {
  let rows;
  try {
    rows = await getDueList();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>;
  }
  const total = rows.reduce((sum, r) => sum + r.due_balance, 0);

  return (
    <>
      <PageHeader
        title="Who owes money"
        description={rows.length === 0 ? "Nobody at the moment." : `${rows.length} ${rows.length === 1 ? "customer owes" : "customers owe"} ${formatCurrency(total)} in total. Longest outstanding first.`}
        action={<LinkButton href="/customers" variant="secondary">All customers</LinkButton>}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={CircleCheck} title="No money owed" description="Every account is settled." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th className="hidden sm:table-cell">Owed since</Th>
                <Th className="text-right">Owes</Th>
                <Th className="text-right">Receive</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td>
                    <Link href={`/customers/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link>
                    {r.phone && <p className="text-xs text-muted">{r.phone}</p>}
                  </Td>
                  <Td className="hidden text-muted sm:table-cell">
                    {r.oldest_due_at ? formatDate(r.oldest_due_at) : "—"}
                    {r.open_sales > 0 && <p className="text-xs">{r.open_sales} {r.open_sales === 1 ? "sale" : "sales"} open</p>}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-warning">{formatCurrency(r.due_balance)}</Td>
                  <Td className="text-right">
                    <ReceivePayment customerId={r.id} dueBalance={r.due_balance} compact />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
