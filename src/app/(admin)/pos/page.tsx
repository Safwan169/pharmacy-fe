import { PageHeader } from "@/components/layout/page-header";
import { CounterTerminal } from "@/components/pos/counter-terminal";
import { listFavourites } from "@/lib/actions/search";
import { getT } from "@/i18n/server";

export const metadata = { title: "Counter" };

export default async function CounterPage() {
  const t = await getT();
  // A new shop has sold nothing yet, so the tiles simply don't appear.
  const favourites = await listFavourites().catch(() => []);

  return (
    <>
      <div className="hide-on-focus">
        <PageHeader title={t("pos.title")} description={t("pos.description")} />
      </div>
      <CounterTerminal favourites={favourites} />
    </>
  );
}
