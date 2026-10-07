import { ChipSingleSelect } from "@/components/app/chip-single-select"
import { useT } from "@/lib/i18n/use-t"
import { useStepFields } from "./use-step-fields"

// New or used. A new vehicle has no mileage, so choosing New empties it.
export function ConditionField() {
  const { t } = useT()
  const { values, set } = useStepFields()
  return (
    <ChipSingleSelect
      legend={t("form.condition")}
      options={(["new", "used"] as const).map((c) => ({
        value: c,
        label: t(`condition.${c}`),
      }))}
      value={values.condition}
      onChange={(v) => {
        set("condition", v)
        if (v === "new") set("mileageKm", null)
      }}
    />
  )
}
