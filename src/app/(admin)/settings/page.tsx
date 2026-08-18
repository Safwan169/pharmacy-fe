import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Pharmacy profile and preferences." />

      <Card>
        <CardHeader title="Pharmacy profile" description="Shown on printed invoices" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Pharmacy name" htmlFor="pharmacyName">
            <Input id="pharmacyName" defaultValue="Springfield Pharmacy" />
          </Field>
          <Field label="License number" htmlFor="license">
            <Input id="license" defaultValue="PH-2024-0917" />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail">
            <Input id="contactEmail" type="email" defaultValue="admin@pharmacy.example" />
          </Field>
          <Field label="Phone" htmlFor="contactPhone">
            <Input id="contactPhone" type="tel" defaultValue="+1 555 0100" />
          </Field>
          <Field label="Default tax rate (%)" htmlFor="taxRate">
            <Input id="taxRate" type="number" step="0.01" defaultValue="5" />
          </Field>
          <Field
            label="Expiry warning (days)"
            hint="How early to flag expiring stock"
            htmlFor="expiryWindow"
          >
            <Input id="expiryWindow" type="number" defaultValue="90" />
          </Field>
        </CardBody>
      </Card>

      <div className="mt-5 flex justify-end">
        <Button type="button">Save changes</Button>
      </div>
    </div>
  );
}
