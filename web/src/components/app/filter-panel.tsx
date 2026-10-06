import { useT } from "@/lib/i18n/use-t"
import type { SearchParams } from "@/features/search/schemas"
import type { ListingPage } from "@/schemas/listing"
import { FilterForm } from "./filter-form"

// Desktop aside. The form follows the URL (chips, clearing, back button) and writes to it as the draft settles.
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
        variant="panel"
        params={params}
        facets={facets}
        onApply={onApply}
      />
    </aside>
  )
}
