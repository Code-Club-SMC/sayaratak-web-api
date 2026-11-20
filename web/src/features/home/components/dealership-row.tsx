import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { DealershipCard } from "@/components/app/dealership-card"
import { homeQueries } from "../queries"
import { HomeEmpty } from "./home-empty"
import { ProviderSection } from "./provider-section"

// Six verified dealerships, best rated first.
export function DealershipRow() {
  const { t } = useT()
  const { data, isPending, isError, refetch } = useQuery(
    homeQueries.dealerships
  )
  return (
    <ProviderSection
      title={t("home.dealerships")}
      href="/dealerships"
      linkLabel={t("home.all_dealerships")}
      pending={isPending}
      error={isError}
      onRetry={() => {
        void refetch()
      }}
      items={(data?.items ?? []).map((d) => ({
        id: d.id,
        node: <DealershipCard dealership={d} />,
      }))}
      empty={
        <HomeEmpty
          art="dealerships"
          title={t("home.empty_dealers_title")}
          body={t("home.empty_dealers_body")}
          href="/onboarding/role"
          label={t("home.empty_dealers_action")}
        />
      }
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    />
  )
}
