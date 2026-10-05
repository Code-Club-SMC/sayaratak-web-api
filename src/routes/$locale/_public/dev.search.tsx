import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"

import { listingQueries } from "@/features/listings/queries"
import {
  searchParamsSchema,
  type SearchParams,
} from "@/features/search/schemas"
import { ActiveFilterChips } from "@/components/app/active-filter-chips"
import { EmptyResults } from "@/components/app/empty-results"
import { FilterPanel } from "@/components/app/filter-panel"
import { FilterSheet } from "@/components/app/filter-sheet"
import { ListingCard } from "@/components/app/listing-card"
import { NotFound } from "@/components/app/not-found"
import { ResultsHeader } from "@/components/app/results-header"
import { ResultsPagination } from "@/components/app/results-pagination"
import { SaveSearchButton } from "@/components/app/save-search-button"
import { SortSelect } from "@/components/app/sort-select"

// Development-only demo for step 4.4. The URL is the only state. Production returns 404. Remove in step 4.7.
export const Route = createFileRoute("/$locale/_public/dev/search")({
  validateSearch: searchParamsSchema,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: SearchDemo,
})

const sorts = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "year_desc",
  "mileage_asc",
  "nearest",
] as const

function SearchDemo() {
  const params = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const go = (search: SearchParams) =>
    void navigate({ to: ".", search, replace: false })
  const { data } = useQuery(listingQueries.list(params))
  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0
  const hasOrigin = params.lat !== undefined && params.lng !== undefined
  return (
    <div className="flex flex-col gap-4 py-8 lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      <FilterPanel params={params} facets={data?.facets} onApply={go} />
      <div className="flex min-w-0 flex-col gap-4">
        <ResultsHeader title="Search demo" total={data?.total ?? 0}>
          <FilterSheet params={params} facets={data?.facets} onApply={go} />
          <SortSelect
            value={params.sort}
            options={hasOrigin ? sorts : sorts.filter((s) => s !== "nearest")}
            onChange={(sort) => go({ ...params, sort, page: 1 })}
          />
          <SaveSearchButton params={params} />
        </ResultsHeader>
        <ActiveFilterChips params={params} onChange={go} />
        {data && data.items.length === 0 ? (
          <EmptyResults params={params} onChange={go} />
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {data?.items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
        <ResultsPagination
          page={params.page}
          pageCount={pageCount}
          hrefFor={(page) =>
            router.buildLocation({ to: ".", search: { ...params, page } }).href
          }
          onPageChange={(page) => go({ ...params, page })}
        />
      </div>
    </div>
  )
}
