import { useT } from "@/lib/i18n/use-t"
import type { SearchParams } from "@/features/search/schemas"
import type { ListingPage } from "@/schemas/listing"
import { FilterForm } from "./filter-form"

// Desktop aside. Keyed by the URL params so the draft resets whenever the URL changes (applying, clearing, back button).
export function FilterPanel({
  params,
  facets,
  onApply,
  className = "hidden lg:block",
}: {
  params: SearchParams
  facets?: ListingPage["facets"]
  onApply: (next: SearchParams) => void
  className?: string
}) {
  const { t } = useT()
  return (
    <aside aria-label={t("search.filters_title")} className={className}>
      <h2 className="mb-4 text-title font-semibold">
        {t("search.filters_title")}
      </h2>
      <FilterForm
        key={JSON.stringify(params)}
        variant="panel"
        params={params}
        facets={facets}
        onApply={onApply}
      />
    </aside>
  )
}
