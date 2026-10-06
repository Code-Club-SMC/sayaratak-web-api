import { useState } from "react"

import { filterKeys, type FilterGroup } from "@/features/search/filters"
import type { SearchParams } from "@/features/search/schemas"
import { useT } from "@/lib/i18n/use-t"
import type { ListingPage } from "@/schemas/listing"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { FilterForm } from "./filter-form"

// Mobile full-height sheet around the same form. Applying closes it.
export function FilterSheet({
  params,
  facets,
  groups,
  onApply,
}: {
  params: SearchParams
  facets?: ListingPage["facets"]
  groups?: readonly FilterGroup[]
  onApply: (next: SearchParams) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const active =
    filterKeys.filter(
      (k) =>
        k !== "lat" &&
        k !== "lng" &&
        k !== "includeSold" &&
        params[k] !== undefined
    ).length + (params.includeSold ? 1 : 0)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
        {t("common.filters")}
        {active > 0 && <span className="num">({active})</span>}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-dvh overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>{t("search.filters_title")}</SheetTitle>
        </SheetHeader>
        <FilterForm
          variant="sheet"
          params={params}
          facets={facets}
          groups={groups}
          onApply={(next) => {
            onApply(next)
            setOpen(false)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
