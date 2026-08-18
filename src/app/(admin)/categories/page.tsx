import { Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { categories } from "@/lib/mock-data";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories"
        description="Group medicines by therapeutic class."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{c.name}</h2>
                <p className="mt-0.5 text-xs text-muted">{c.description}</p>
                <p className="mt-2 text-xs font-medium text-primary">
                  {c.medicineCount} medicines
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
