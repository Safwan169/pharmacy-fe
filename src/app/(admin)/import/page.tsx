import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ImportForm } from "@/components/import/import-form";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import the catalogue"
        description="Load medicines in bulk from a spreadsheet exported as CSV."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upload a file"
            description="Safe to run more than once — see what it does and doesn't touch, on the right."
          />
          <CardBody>
            <ImportForm />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Alert tone="info" title="Your prices are safe">
            Importing again never overwrites the prices or stock counts you have
            entered. It only refreshes names, strengths and other details, and
            adds medicines that weren&apos;t there before.
          </Alert>

          <Alert tone="warning" title="Prices don't come from the file">
            Every medicine arrives without a price, because the source file
            doesn&apos;t store them in a usable form. After importing, go to{" "}
            <strong>Pricing</strong> to set them — nothing can be sold until it
            has a price.
          </Alert>

          <Alert tone="info" title="Very large files">
            A full catalogue of 20,000+ rows can take several minutes and may
            time out in the browser. If that happens, ask your developer to run
            the import directly on the server instead.
          </Alert>
        </div>
      </div>
    </>
  );
}
