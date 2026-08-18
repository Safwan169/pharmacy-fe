import { PageHeader } from "@/components/layout/page-header";
import { MedicineForm } from "@/components/medicines/medicine-form";
import { categories, suppliers } from "@/lib/mock-data";

export const metadata = { title: "Add medicine" };

export default function NewMedicinePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Add medicine"
        description="Register a new item in the inventory."
      />
      <MedicineForm categories={categories} suppliers={suppliers} />
    </div>
  );
}
