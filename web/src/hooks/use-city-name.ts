import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"

// Empty until the taxonomy arrives; route loaders prefetch it so server HTML already has the name.
export function useCityName(cityId: string) {
  const { locale } = useT()
  const { data } = useQuery(taxonomyQuery)
  return data?.cities.find((city) => city.id === cityId)?.name[locale] ?? ""
}
