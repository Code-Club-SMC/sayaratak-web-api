import { useFormContext } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PriceFields } from "@/components/app/price-fields"
import { RentPeriodSelect } from "@/components/app/rent-period-select"
import { Input } from "@/components/ui/input"
import { DescriptionField } from "@/features/onboarding/components/description-field"
import { useT } from "@/lib/i18n/use-t"
import { useStepFields } from "./use-step-fields"

// Title, description and price: what every listing has, vehicle or part, for sale or for rent.
export function CommonFields() {
  const { t } = useT()
  const { register } = useFormContext()
  const { values, error, set } = useStepFields()
  return (
    <>
      <FormField label={t("form.title")} error={error("title")}>
        {(control) => <Input {...control} {...register("title")} dir="auto" />}
      </FormField>
      <DescriptionField label={t("form.description")} max={2000} />
      <PriceFields
        value={{ price: values.price, negotiable: values.negotiable }}
        onChange={(next) => {
          set("price", next.price)
          set("negotiable", next.negotiable)
        }}
        error={error("price")}
      />
      {values.intent === "rent" && (
        <RentPeriodSelect
          value={values.rentPeriod}
          onChange={(v) => set("rentPeriod", v)}
          error={error("rentPeriod")}
        />
      )}
    </>
  )
}
