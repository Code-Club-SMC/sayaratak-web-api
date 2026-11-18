import { useId, useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import {
  compareSchema,
  rangeSchema,
  type PeriodQuery,
} from "@sayaratak/shared/schemas/period"
import { CustomRangePopover } from "./custom-range-popover"
import { SelectInput } from "./select-input"

const ranges = ["7d", "30d", "90d"] as const

// The report period: a preset or a custom range with times, and what to compare with. Controlled; report pages keep the value in the URL (`usePeriodSearch`), the listing sheet in state.
export function PeriodControl({
  value,
  onChange,
}: {
  value: PeriodQuery
  onChange: (value: PeriodQuery) => void
}) {
  const { t } = useT()
  const id = useId()
  const [open, setOpen] = useState(false)
  const custom =
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`${id}-range`} className="text-ui text-muted-foreground">
        {t("dashboard.range_label")}
      </label>
      <SelectInput
        id={`${id}-range`}
        className="w-auto"
        value={custom || open ? "custom" : value.range}
        options={[
          ...ranges.map((r) => ({
            value: r,
            label: t(`dashboard.range_${r}`),
          })),
          { value: "custom", label: t("dashboard.range_custom") },
        ]}
        onChange={(next) => {
          if (next === "custom") return setOpen(true)
          onChange({ range: rangeSchema.parse(next), compare: value.compare })
        }}
      />
      {(custom || open) && (
        <CustomRangePopover
          // A new range starts the picker fresh.
          key={custom ? `${custom.from}-${custom.to}` : "new"}
          value={custom}
          open={open}
          onOpenChange={setOpen}
          onApply={(range) => {
            setOpen(false)
            onChange({ ...value, ...range })
          }}
        />
      )}
      <label
        htmlFor={`${id}-compare`}
        className="text-ui text-muted-foreground"
      >
        {t("dashboard.compare_label")}
      </label>
      <SelectInput
        id={`${id}-compare`}
        className="w-auto"
        value={value.compare}
        options={compareSchema.options.map((c) => ({
          value: c,
          label: t(`dashboard.compare_${c}`),
        }))}
        onChange={(next) =>
          onChange({ ...value, compare: compareSchema.parse(next) })
        }
      />
    </div>
  )
}
