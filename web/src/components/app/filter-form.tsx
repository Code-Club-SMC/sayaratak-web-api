import { Controller, FormProvider, useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"

import { listingQueries, taxonomyQuery } from "@/features/listings/queries"
import {
  applyDraft,
  clearFilters,
  radii,
  toDraft,
} from "@/features/search/filters"
import type { SearchParams } from "@/features/search/schemas"
import { useDebounced } from "@/hooks/use-debounced"
import { useFacetLabel } from "@/features/search/use-facet-label"
import { useT } from "@/lib/i18n/use-t"
import type { ListingPage } from "@/schemas/listing"
import { Button } from "@/components/ui/button"
import { ChipSingleSelect } from "./chip-single-select"
import { CheckboxGroup } from "./checkbox-group"
import { CityDistrictFields } from "./city-district-fields"
import { FormField } from "./form-field"
import { FilterVehicleFields } from "./filter-vehicle-fields"
import { FormSection } from "./form-section"
import { NumberField } from "./number-field"
import { SelectInput } from "./select-input"

type Facets = ListingPage["facets"]

// One form for the desktop panel and the mobile sheet. It edits a local draft; nothing reaches the URL until "Apply" (panel) or "Show N results" (sheet).
export function FilterForm({
  params,
  facets,
  variant,
  onApply,
}: {
  params: SearchParams
  facets?: Facets
  variant: "panel" | "sheet"
  onApply: (next: SearchParams) => void
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const methods = useForm({ defaultValues: toDraft(params) })
  const { control, handleSubmit, watch, setValue } = methods
  const draft = watch()
  const centerOf = (city: string) =>
    tax?.cities.find((c) => c.id === city)?.center
  const next = () => applyDraft(params, draft, centerOf(draft.city))
  // Live count for the sheet button; the panel shows facet counts instead.
  const preview = useDebounced(next())
  const { data: count } = useQuery({
    ...listingQueries.list(preview),
    enabled: variant === "sheet",
    select: (page) => page.total,
  })

  const withCount = useFacetLabel(facets)
  const isPart = params.kind === "part"
  const typeOptions = isPart
    ? (tax?.partCategories ?? []).map((c) => ({
        value: c.id,
        label: c.name[locale],
      }))
    : (tax?.vehicleTypes ?? [])
        .filter((v) => v.enabled)
        .map((v) => ({
          value: v.id,
          label: withCount(v.name[locale], facets?.type, v.id),
        }))
  const any = { value: "", label: t("search.any") }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit((d) =>
          onApply(applyDraft(params, d, centerOf(d.city)))
        )}
        className="flex flex-col gap-6"
      >
        <FormSection title={t("search.group_category")}>
          <Controller
            control={control}
            name={isPart ? "partCategory" : "type"}
            render={({ field }) => (
              <ChipSingleSelect
                legend={t(
                  isPart ? "search.part_category" : "search.vehicle_type"
                )}
                options={[any, ...typeOptions]}
                value={field.value ?? ""}
                onChange={(v) => {
                  field.onChange(v || null)
                  if (!isPart) setValue("make", "")
                  setValue("model", "")
                }}
              />
            )}
          />
        </FormSection>
        <FormSection title={t("search.group_price")}>
          <div className="grid grid-cols-2 gap-3">
            {(["minPrice", "maxPrice"] as const).map((name) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <FormField
                    label={t(
                      `search.${name === "minPrice" ? "min_price" : "max_price"}`
                    )}
                  >
                    {(c) => (
                      <NumberField
                        {...c}
                        grouping
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  </FormField>
                )}
              />
            ))}
          </div>
        </FormSection>
        {!isPart && <FilterVehicleFields facets={facets} />}
        <FormSection title={t("search.group_condition")}>
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <ChipSingleSelect
                legend={t("search.condition")}
                options={[
                  any,
                  { value: "new", label: t("condition.new") },
                  { value: "used", label: t("condition.used") },
                ]}
                value={field.value ?? ""}
                onChange={(v) =>
                  field.onChange(v === "new" || v === "used" ? v : null)
                }
              />
            )}
          />
        </FormSection>
        <FormSection title={t("search.group_location")}>
          <CityDistrictFields
            value={{ cityId: draft.city, districtId: draft.district }}
            onChange={(v) => {
              setValue("city", v.cityId)
              setValue("district", v.districtId)
            }}
          />
          <FormField label={t("search.radius")}>
            {(c) => (
              <SelectInput
                {...c}
                disabled={!draft.city && params.lat === undefined}
                value={draft.radius ? String(draft.radius) : ""}
                placeholder={t("search.radius_any")}
                options={radii.map((r) => ({
                  value: String(r),
                  label: t("search.radius_value", { km: r }),
                }))}
                onChange={(v) => setValue("radius", v ? Number(v) : null)}
              />
            )}
          </FormField>
        </FormSection>
        <FormSection title={t("search.group_more")}>
          <CheckboxGroup
            legend={t("search.group_more")}
            options={[
              { value: "verifiedOnly", label: t("search.verified_only") },
              { value: "hasVideo", label: t("search.has_video") },
              { value: "includeSold", label: t("search.include_sold") },
            ]}
            value={(
              ["verifiedOnly", "hasVideo", "includeSold"] as const
            ).filter((k) => draft[k])}
            onChange={(on) => {
              for (const k of [
                "verifiedOnly",
                "hasVideo",
                "includeSold",
              ] as const)
                setValue(k, on.includes(k))
            }}
          />
        </FormSection>
        <div className="sticky bottom-0 flex gap-3 bg-background py-3">
          <Button type="submit" className="flex-1">
            {variant === "sheet" && count !== undefined
              ? t("search.show_results", { count })
              : t("search.apply")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onApply(clearFilters(params))}
          >
            {t("common.clear_all")}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
