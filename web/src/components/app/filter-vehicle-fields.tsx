import { Controller, useFormContext } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import type { FilterDraft } from "@/features/search/filters"
import { useFacetLabel } from "@/features/search/use-facet-label"
import { useT } from "@/lib/i18n/use-t"
import type { ListingPage } from "@/schemas/listing"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ChipMultiSelect } from "./chip-multi-select"
import { FormField } from "./form-field"
import { FormSection } from "./form-section"
import { NumberField } from "./number-field"

// Make and model, year, mileage, fuel and transmission. Vehicles only; part searches skip this group.
export function FilterVehicleFields({
  facets,
}: {
  facets?: ListingPage["facets"]
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
      <FormSection title={t("search.group_make")}>
        <FormField label={t("form.make")}>
          {(c) => (
            <NativeSelect
              {...c}
              className="w-full"
              value={draft.make}
              onChange={(e) => {
                setValue("make", e.target.value)
                setValue("model", "")
              }}
            >
              <NativeSelectOption value="">
                {t("form.select_make")}
              </NativeSelectOption>
              {makes.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {withCount(m.name[locale], facets?.make, m.id)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        {draft.make && (
          <FormField label={t("form.model")}>
            {(c) => (
              <NativeSelect
                {...c}
                className="w-full"
                value={draft.model}
                onChange={(e) => setValue("model", e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("form.select_model")}
                </NativeSelectOption>
                {models.map((m) => (
                  <NativeSelectOption key={m.id} value={m.id}>
                    {m.name[locale]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
        )}
      </FormSection>
      <FormSection title={t("search.group_year")}>
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
      </FormSection>
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
    </>
  )
}
