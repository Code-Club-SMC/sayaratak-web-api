import { useEffect, useRef, useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"

import { listingQueries, taxonomyQuery } from "@/features/listings/queries"
import {
  applyDraft,
  clearFilters,
  radii,
  toDraft,
  type FilterGroup,
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
import { FilterSpecFields } from "./filter-spec-fields"
import { FilterVehicleFields } from "./filter-vehicle-fields"
import { FormSection } from "./form-section"
import { NumberField } from "./number-field"
import { SelectInput } from "./select-input"

type Facets = ListingPage["facets"]

// One form for the desktop panel and the mobile sheet. It edits a local draft. The panel writes it to the URL 300 ms after the last change; the sheet waits for "Show N results".
export function FilterForm({
  params,
  facets,
  variant,
  groups,
  onApply,
}: {
  params: SearchParams
  facets?: Facets
  variant: "panel" | "sheet"
  groups?: readonly FilterGroup[]
  onApply: (next: SearchParams) => void
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const methods = useForm({ defaultValues: toDraft(params) })
  const { control, handleSubmit, watch, setValue, reset } = methods
  const draft = watch()
  const [place, setPlace] = useState<"idle" | "asking" | "failed">("idle")
  const centerOf = (city: string) =>
    tax?.cities.find((c) => c.id === city)?.center
  const next = () => applyDraft(params, draft, centerOf(draft.city))
  // The last draft that is, or is about to be, in the URL. A URL that arrives with anything else (a chip, "Clear all", the back button) replaces the draft; one this form wrote leaves it alone, so typing is never interrupted.
  const synced = useRef(JSON.stringify(toDraft(params)))
  useEffect(() => {
    const incoming = JSON.stringify(toDraft(params))
    if (incoming === synced.current) return
    synced.current = incoming
    reset(toDraft(params))
  }, [params, reset])
  const settled = useDebounced(JSON.stringify(draft))
  useEffect(() => {
    if (variant !== "panel" || settled === synced.current) return
    synced.current = settled
    onApply(next())
    // `next` and `onApply` change every render; only a settled draft should fire this.
  }, [settled, variant])
  // Live count for the sheet button; the panel shows facet counts instead.
  const preview = useDebounced(next())
  const { data: count } = useQuery({
    ...listingQueries.list(preview),
    enabled: variant === "sheet",
    select: (page) => page.total,
  })

  // A radius counts from the city center or from a position. With neither, the browser is asked once; if that fails the control stays off until a city is chosen or the position is shared.
  const located = Boolean(draft.city) || draft.origin !== null
  const locate = () => {
    setPlace("asking")
    const failed = () => {
      setPlace("failed")
      setValue("radius", null)
    }
    if (!("geolocation" in navigator)) return failed()
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace("idle")
        setValue("origin", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      failed,
      { timeout: 10_000 }
    )
  }

  const withCount = useFacetLabel(facets)
  const isPart = params.kind === "part"
  const vehicleTypes = (tax?.vehicleTypes ?? [])
    .filter((v) => v.enabled)
    .map((v) => ({
      value: v.id,
      label: withCount(v.name[locale], facets?.type, v.id),
    }))
  const partCategories = (tax?.partCategories ?? []).map((c) => ({
    value: c.id,
    label: c.name[locale],
  }))
  const any = { value: "", label: t("search.any") }
  const show = (g: FilterGroup) => !groups || groups.includes(g)

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit((d) =>
          onApply(applyDraft(params, d, centerOf(d.city)))
        )}
        className="flex flex-col gap-6"
      >
        {show("category") && (
          <FormSection title={t("search.group_category")}>
            {isPart && (
              <Controller
                control={control}
                name="partCategory"
                render={({ field }) => (
                  <ChipSingleSelect
                    legend={t("search.part_category")}
                    options={[any, ...partCategories]}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v || null)}
                  />
                )}
              />
            )}
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <ChipSingleSelect
                  legend={t(
                    isPart ? "search.fits_type" : "search.vehicle_type"
                  )}
                  options={[any, ...vehicleTypes]}
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v || null)
                    if (!isPart) {
                      setValue("make", "")
                      setValue("model", "")
                    }
                  }}
                />
              )}
            />
          </FormSection>
        )}
        {show("price") && (
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
        )}
        {!isPart && <FilterVehicleFields facets={facets} show={show} />}
        {show("condition") && (
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
        )}
        {show("location") && (
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
                  disabled={
                    place === "asking" || (!located && place === "failed")
                  }
                  value={draft.radius ? String(draft.radius) : ""}
                  placeholder={t("search.radius_any")}
                  options={radii.map((r) => ({
                    value: String(r),
                    label: t("search.radius_value", { km: r }),
                  }))}
                  onChange={(v) => {
                    setValue("radius", v ? Number(v) : null)
                    if (v && !located) locate()
                  }}
                />
              )}
            </FormField>
            {!located && place === "failed" && (
              <div className="flex flex-col items-start gap-2">
                <p className="text-caption text-muted-foreground">
                  {t("search.radius_needs_place")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={locate}
                >
                  {t("search.use_location")}
                </Button>
              </div>
            )}
          </FormSection>
        )}
        {show("spec") && (
          <FilterSpecFields part={isPart} intent={params.intent} />
        )}
        {show("more") && (
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
        )}
        <div className="sticky bottom-0 flex gap-3 bg-background py-3">
          {variant === "sheet" && (
            <Button type="submit" className="flex-1">
              {count !== undefined
                ? t("search.show_results", { count })
                : t("search.apply")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className={variant === "panel" ? "flex-1" : undefined}
            onClick={() => onApply(clearFilters(params))}
          >
            {t("common.clear_all")}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
