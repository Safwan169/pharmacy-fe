import { PageHeader } from "@/components/layout/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const metadata = { title: "Add supplier" };

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add supplier" description="Register a new supplier." />
      <SupplierForm />
    </div>
  );
}
