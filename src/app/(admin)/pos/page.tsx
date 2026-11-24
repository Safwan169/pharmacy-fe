import { PageHeader } from "@/components/layout/page-header";
import { CounterTerminal } from "@/components/pos/counter-terminal";
import { listFavourites } from "@/lib/actions/search";
import { getSettings } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/alert";
import { parseBankNames } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Counter" };

export default async function CounterPage() {
  const t = await getT();
  // A new shop has sold nothing yet, so the tiles simply don't appear.
  const favourites = await listFavourites().catch(() => []);
  let bankNames: string[];
  try {
    bankNames = parseBankNames((await getSettings()).bank_names);
  } catch (error) {
    return (
      <>
        <PageHeader title={t("pos.title")} description={t("pos.description")} />
        <Alert tone="error">
          {error instanceof ApiError || error instanceof Error ? error.message : t("common.refresh")}
        </Alert>
      </>
    );
  }

  return (
    <>
      <div className="hide-on-focus">
        <PageHeader title={t("pos.title")} description={t("pos.description")} />
      </div>
      <CounterTerminal favourites={favourites} bankNames={bankNames} />
    </>
  );
}
