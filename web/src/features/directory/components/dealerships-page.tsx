import { useQuery } from "@tanstack/react-query"

import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { BannerSlot } from "@/components/app/banner-slot"
import { DealershipCard } from "@/components/app/dealership-card"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { resultsHeadingId } from "@/components/app/results-header"
import { ResultsPagination } from "@/components/app/results-pagination"
import { ResultsRegion } from "@/components/app/results-region"
import { SectionError } from "@/components/app/section-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { dealershipFilters } from "../loader"
import { directoryQueries } from "../queries"
import { dealershipSearchSchema, type DealershipSearch } from "../schemas"
import { DealershipToolbar } from "./dealership-toolbar"

const grid = "grid gap-3 md:grid-cols-2 xl:grid-cols-3"

export function DealershipsPage({
  search,
  onChange,
  onPageChange,
  hrefFor,
}: {
  search: DealershipSearch
  onChange: (next: DealershipSearch) => void
  onPageChange: (page: number) => void
  hrefFor: (page: number) => string
}) {
  const { t, locale } = useT()
  const list = useQuery(
    directoryQueries.dealerships.list(dealershipFilters(search))
  )
  const { data } = list
  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0

  let results
  if (!data)
    results = list.isError ? (
      <SectionError
        message={t("directory.load_error")}
        onRetry={() => {
          void list.refetch()
        }}
      />
    ) : (
      <div role="status" aria-label={t("common.loading")} className={grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  else if (data.total === 0)
    results = (
      <EmptyState
        title={t("directory.dealerships_empty_title")}
        body={t("directory.dealerships_empty_body")}
        action={
          <Button
            type="button"
            onClick={() => onChange(dealershipSearchSchema.parse({}))}
          >
            {t("common.clear_all")}
          </Button>
        }
      />
    )
  else
    results = (
      <>
        <ResultsRegion stale={list.isPlaceholderData}>
          <ul className={grid}>
            {data.items.map((d) => (
              <li key={d.id} className="*:h-full">
                <DealershipCard dealership={d} headingAs="h2" />
              </li>
            ))}
          </ul>
        </ResultsRegion>
        <ResultsPagination
          page={data.page}
          pageCount={pageCount}
          hrefFor={hrefFor}
          onPageChange={onPageChange}
        />
      </>
    )

  return (
    <div className="flex flex-col gap-4 pt-4 pb-12 md:gap-6 md:pt-6">
      <BannerSlot placement="directory_top" />
      <PageHeader
        title={t("nav.dealerships")}
        count={data ? formatNumber(data.total, locale) : undefined}
        headingId={resultsHeadingId}
      />
      <DealershipToolbar search={search} onChange={onChange} />
      {results}
    </div>
  )
}
