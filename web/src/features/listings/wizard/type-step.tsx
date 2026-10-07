import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFormContext } from "react-hook-form"

import { ChipMultiSelect } from "@/components/app/chip-multi-select"
import { ChipSingleSelect } from "@/components/app/chip-single-select"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import {
  applyTile,
  detailsTouched,
  tileOf,
  tiles,
  type Tile,
} from "./type-change"
import { TypeTiles } from "./type-tiles"
import { useStepFields } from "./use-step-fields"

// Step `type`: what is being posted, then the one follow-up that type needs.
export function TypeStep() {
  const { t, locale } = useT()
  const { getValues } = useFormContext()
  const { values, error, set } = useStepFields()
  const { data: tax } = useQuery(taxonomyQuery)
  const [asked, setAsked] = useState<Tile | null>(null)
  const current = tileOf(values)

  const apply = (tile: Tile) => {
    const before = getValues()
    const next = applyTile(before, tile, tax?.makes ?? [])
    for (const [field, value] of Object.entries(next))
      if (JSON.stringify(before[field]) !== JSON.stringify(value))
        set(field, value)
  }
  const choose = (tile: Tile) => {
    if (tile === current) return
    if (current !== null && detailsTouched(getValues())) setAsked(tile)
    else apply(tile)
  }
  const enabled = new Set(
    tax?.vehicleTypes.filter((v) => v.enabled).map((v) => v.id)
  )
  const shown = tiles.filter((x) => !tax || x === "part" || enabled.has(x))
  const label = (name: { en: string; ar: string }) => name[locale]

  return (
    <>
      <TypeTiles
        tiles={shown}
        value={current}
        onChange={choose}
        error={error("vehicleType")}
      />
      {values.kind === "vehicle" && values.vehicleType && (
        <ChipSingleSelect
          legend={t("post.intent_legend")}
          options={[
            { value: "sale", label: t("listing.sale") },
            { value: "rent", label: t("listing.rent") },
          ]}
          value={values.intent}
          onChange={(v) => {
            set("intent", v)
            if (v === "sale") set("rentPeriod", null)
          }}
        />
      )}
      {values.kind === "part" && (
        <>
          <ChipSingleSelect
            legend={t("search.part_category")}
            options={(tax?.partCategories ?? []).map((c) => ({
              value: c.id,
              label: label(c.name),
            }))}
            value={values.partCategoryId}
            onChange={(v) => set("partCategoryId", v)}
            error={error("partCategoryId")}
          />
          <ChipMultiSelect
            legend={t("post.fits")}
            options={(tax?.vehicleTypes ?? [])
              .filter((v) => v.enabled)
              .map((v) => ({ value: v.id, label: label(v.name) }))}
            value={values.compatibleTypes}
            onChange={(v) => set("compatibleTypes", v)}
            error={error("compatibleTypes")}
          />
        </>
      )}
      <ConfirmDialog
        open={asked !== null}
        onOpenChange={(open) => !open && setAsked(null)}
        title={t("post.change_type_title")}
        description={t("post.change_type_body")}
        confirmLabel={t("post.change_type_confirm")}
        onConfirm={() => {
          if (asked) apply(asked)
          setAsked(null)
        }}
      />
    </>
  )
}
