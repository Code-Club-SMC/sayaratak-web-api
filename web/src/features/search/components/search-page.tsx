import { useQuery } from "@tanstack/react-query"
import { defaultStringifySearch } from "@tanstack/react-router"

import { listingQueries, taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import { ActiveFilterChips } from "@/components/app/active-filter-chips"
import { BannerSlot } from "@/components/app/banner-slot"
import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { EmptyResults } from "@/components/app/empty-results"
import { FilterPanel } from "@/components/app/filter-panel"
import { FilterSheet } from "@/components/app/filter-sheet"
import { ListingGrid } from "@/components/app/listing-grid"
import { GridCard } from "@/components/app/page-skeleton"
import { ResultsHeader } from "@/components/app/results-header"
import { ResultsPagination } from "@/components/app/results-pagination"
import { ResultsRegion } from "@/components/app/results-region"
import { SaveSearchButton } from "@/components/app/save-search-button"
import { SectionError } from "@/components/app/section-error"
import { SortSelect } from "@/components/app/sort-select"
import { buttonVariants } from "@/components/ui/button"
import { routeHref, searchRoute } from "../landing"
import { compact, searchParamsSchema, type SearchParams } from "../schemas"
import { searchTitle } from "../title"
import { SearchBar } from "./search-bar"
import { ViewToggle } from "./view-toggle"

const vehicleSorts = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "year_desc",
  "mileage_asc",
] as const
const partSorts = ["relevance", "newest", "price_asc", "price_desc"] as const

// One results page for /search, /parts and the landing presets. The route owns the URL: `search` is what it parsed, `onChange` writes a whole new set of filters back, and the page changes come as links.
export function SearchPage({
  search,
  onChange,
  onPageChange,
  hrefFor,
}: {
  search: SearchParams
  onChange: (next: SearchParams) => void
  onPageChange: (page: number) => void
  hrefFor: (page: number) => string
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const list = useQuery(listingQueries.list(search))
  const { data } = list
  const title = searchTitle(search, tax, locale, t)

  const category =
    search.kind === "part"
      ? t("search.all_parts")
      : (tax?.vehicleTypes.find((v) => v.id === search.type)?.name[locale] ??
        t("search.all_vehicles"))
  const city = tax?.cities.find((c) => c.id === search.city)?.name[locale]
  const crumbs = [
    { label: t("nav.home"), href: "/" },
    city
      ? {
          label: category,
          href: routeHref(
            searchRoute({
              ...searchParamsSchema.parse({}),
              kind: search.kind,
              type: search.type,
              intent: search.intent,
            })
          ),
        }
      : { label: category },
    ...(city ? [{ label: city }] : []),
  ]

  const sorts: SearchParams["sort"][] = [
    ...(search.kind === "part" ? partSorts : vehicleSorts),
    ...(search.lat !== undefined && search.lng !== undefined
      ? (["nearest"] as const)
      : []),
  ]
  // The map takes the same filters; paging has no meaning there.
  const map = `/map${defaultStringifySearch(compact({ ...search, page: 1 }))}`

  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0
  let results
  if (!data)
    results = list.isError ? (
      <SectionError
        message={t("search.load_error")}
        onRetry={() => {
          void list.refetch()
        }}
      />
    ) : (
      <div
        role="status"
        aria-label={t("common.loading")}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <GridCard key={i} />
        ))}
      </div>
    )
  else if (data.total === 0)
    results = (
      <EmptyResults params={search} facets={data.facets} onChange={onChange} />
    )
  else
    results = (
      <>
        <ResultsRegion stale={list.isPlaceholderData}>
          <ListingGrid listings={data.items} eager={4} sidebar />
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
    <div className="flex flex-col gap-4 pt-4 pb-12 md:pt-6">
      <BannerSlot placement="search_top" />
      <Breadcrumbs items={crumbs} />
      <SearchBar search={search} onChange={onChange} />
      <ResultsHeader title={title} total={data?.total}>
        <FilterSheet params={search} facets={data?.facets} onApply={onChange} />
        <SortSelect
          value={search.sort}
          options={sorts}
          onChange={(sort) => onChange({ ...search, sort, page: 1 })}
        />
        <ViewToggle />
        <SaveSearchButton params={search} />
        <a
          href={localeHref(map, locale)}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("search.show_on_map")}
        </a>
      </ResultsHeader>
      <ActiveFilterChips params={search} onChange={onChange} />
      <div className="grid gap-6 lg:grid-cols-[296px_minmax(0,1fr)]">
        <FilterPanel
          params={search}
          facets={data?.facets}
          onApply={onChange}
          className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto lg:block"
        />
        <div className="flex min-w-0 flex-col gap-6">{results}</div>
      </div>
    </div>
  )
}
