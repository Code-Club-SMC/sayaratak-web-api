import { Controller, useFormContext } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import type { FilterDraft, FilterGroup } from "@/features/search/filters"
import { useFacetLabel } from "@/features/search/use-facet-label"
import { useT } from "@/lib/i18n/use-t"
import type { ListingPage } from "@/schemas/listing"
import { ChipMultiSelect } from "./chip-multi-select"
import { FormField } from "./form-field"
import { FormSection } from "./form-section"
import { NumberField } from "./number-field"
import { SelectInput } from "./select-input"

// Make and model, year, mileage, fuel and transmission. Vehicles only; part searches skip this group.
export function FilterVehicleFields({
  facets,
  show,
}: {
  facets?: ListingPage["facets"]
  show: (group: FilterGroup) => boolean
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const { control, watch, setValue } = useFormContext<FilterDraft>()
  const draft = watch()
  const withCount = useFacetLabel(facets)
  const makes = (tax?.makes ?? []).filter(
    (m) => !draft.type || m.vehicleTypes.includes(draft.type)
  )
  const models = (tax?.models ?? []).filter((m) => m.makeId === draft.make)
  const optionsOf = (kind: "fuel" | "transmission", values: string[]) =>
    values.map((v) => ({
      value: v,
      label: withCount(t(`${kind}.${v}`), facets?.[kind], v),
    }))
  return (
    <>
      {show("make") && (
        <FormSection title={t("search.group_make")}>
          <FormField label={t("form.make")}>
            {(c) => (
              <SelectInput
                {...c}
                value={draft.make}
                placeholder={t("form.select_make")}
                options={makes.map((m) => ({
                  value: m.id,
                  label: withCount(m.name[locale], facets?.make, m.id),
                }))}
                onChange={(v) => {
                  setValue("make", v)
                  setValue("model", "")
                }}
              />
            )}
          </FormField>
          {draft.make && (
            <FormField label={t("form.model")}>
              {(c) => (
                <SelectInput
                  {...c}
                  value={draft.model}
                  placeholder={t("form.select_model")}
                  options={models.map((m) => ({
                    value: m.id,
                    label: m.name[locale],
                  }))}
                  onChange={(v) => setValue("model", v)}
                />
              )}
            </FormField>
          )}
        </FormSection>
      )}
      {(show("year") || show("mileage")) && (
        <FormSection
          title={t(
            show("mileage") ? "search.group_year" : "search.group_year_only"
          )}
        >
          {show("year") && (
            <div className="grid grid-cols-2 gap-3">
              {(["minYear", "maxYear"] as const).map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <FormField
                      label={t(
                        `search.${name === "minYear" ? "min_year" : "max_year"}`
                      )}
                    >
                      {(c) => (
                        <NumberField
                          {...c}
                          min={1970}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    </FormField>
                  )}
                />
              ))}
            </div>
          )}
          {show("mileage") && (
            <Controller
              control={control}
              name="maxMileage"
              render={({ field }) => (
                <FormField label={t("search.max_mileage")}>
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
          )}
        </FormSection>
      )}
      {show("fuel") && (
        <FormSection title={t("search.group_fuel")}>
          <Controller
            control={control}
            name="fuel"
            render={({ field }) => (
              <ChipMultiSelect
                legend={t("search.fuel")}
                options={optionsOf("fuel", [
                  "petrol",
                  "diesel",
                  "hybrid",
                  "electric",
                  "lpg",
                ])}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="transmission"
            render={({ field }) => (
              <ChipMultiSelect
                legend={t("search.transmission")}
                options={optionsOf("transmission", ["automatic", "manual"])}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormSection>
      )}
    </>
  )
}
