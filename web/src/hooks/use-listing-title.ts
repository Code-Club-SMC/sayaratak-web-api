import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import type { Listing } from "@/schemas/listing"

type Titled = Pick<
  Listing,
  | "title"
  | "kind"
  | "makeId"
  | "modelId"
  | "makeOther"
  | "modelOther"
  | "year"
  | "partCategoryId"
>

// A seller types the title in one language, so cards and rows build it from the taxonomy instead ("Toyota Corolla 2018", "Brakes · Toyota") in the page language. The typed title is the fallback until the taxonomy arrives; route loaders prefetch it.
export function useListingTitle() {
  const { locale } = useT()
  const { data } = useQuery(taxonomyQuery)
  return (l: Titled) => {
    if (!data) return l.title
    const make = l.makeId
      ? data.makes.find((m) => m.id === l.makeId)?.name[locale]
      : l.makeOther
    if (l.kind === "part") {
      const category = data.partCategories.find(
        (c) => c.id === l.partCategoryId
      )?.name[locale]
      return [category, make].filter(Boolean).join(" · ") || l.title
    }
    const model = l.modelId
      ? data.models.find((m) => m.id === l.modelId)?.name[locale]
      : l.modelOther
    return [make, model, l.year].filter(Boolean).join(" ") || l.title
  }
}
