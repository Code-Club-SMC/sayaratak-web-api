import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { clearFilters, distanceKm, radii } from "@/features/search/filters"
import type { SearchParams } from "@/features/search/schemas"
import { useActiveFilters } from "@/features/search/use-active-filters"
import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"

// A4 item 11: say what to loosen instead of a dead end. Every suggestion is a button that applies it.
export function EmptyResults({
  params,
  onChange,
}: {
  params: SearchParams
  onChange: (next: SearchParams) => void
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const filters = useActiveFilters(params)
  const wider = radii.find((r) => params.radius && r > params.radius)
  const here = tax?.cities.find((c) => c.id === params.city)
  const nearby =
    here && tax
      ? tax.cities
          .filter((c) => c.id !== here.id)
          .sort(
            (a, b) =>
              distanceKm(here.center, a.center) -
              distanceKm(here.center, b.center)
          )
          .slice(0, 3)
      : []
  return (
    <section className="flex flex-col items-start gap-4 py-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-semibold">{t("search.no_results")}</h2>
        <p className="text-body text-muted-foreground">
          {t("search.empty_hint")}
        </p>
      </div>
      <h3 className="text-ui font-medium">{t("search.suggest_title")}</h3>
      <ul className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <li key={f.id}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(f.next)}
            >
              {t("search.remove_filter", { label: f.label })}
            </Button>
          </li>
        ))}
        {wider && (
          <li>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ ...params, radius: wider, page: 1 })}
            >
              {t("search.suggest_radius", { km: wider })}
            </Button>
          </li>
        )}
        {nearby.map((c) => (
          <li key={c.id}>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...params,
                  city: c.id,
                  district: undefined,
                  radius: undefined,
                  lat: undefined,
                  lng: undefined,
                  page: 1,
                })
              }
            >
              {t("search.suggest_city", { city: c.name[locale] })}
            </Button>
          </li>
        ))}
        {filters.length > 0 && (
          <li>
            <Button
              type="button"
              onClick={() => onChange(clearFilters(params))}
            >
              {t("common.clear_all")}
            </Button>
          </li>
        )}
      </ul>
    </section>
  )
}
