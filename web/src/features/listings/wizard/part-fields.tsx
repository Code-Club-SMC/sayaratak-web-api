import { useFormContext } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n/use-t"
import { ConditionField } from "./condition-field"
import { DetailsMakeModel } from "./details-make-model"
import { useStepFields } from "./use-step-fields"

// Details of a spare part: condition, the make and model it comes from or fits, and its part number.
export function PartFields() {
  const { t } = useT()
  const { register } = useFormContext()
  const { error } = useStepFields()
  return (
    <>
      <ConditionField />
      <FieldSet>
        <FieldLegend variant="label">{t("post.part_make_legend")}</FieldLegend>
        <DetailsMakeModel />
      </FieldSet>
      <FormField
        label={t("form.part_number")}
        optional
        error={error("partNumber")}
      >
        {(control) => (
          <Input {...control} {...register("partNumber")} dir="ltr" />
        )}
      </FormField>
    </>
  )
}
