import { useFormContext, useWatch } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { Textarea } from "@/components/ui/textarea"

type Fields = { description: string }

// The about text of a business, with a live character counter.
export function DescriptionField({
  label,
  max = 1000,
}: {
  label: string
  max?: number
}) {
  const { register, control, formState } = useFormContext<Fields>()
  const length = useWatch({ control, name: "description" }).length
  return (
    <FormField
      label={label}
      error={formState.errors.description?.message}
      description={`${length}/${max}`}
    >
      {(c) => <Textarea {...c} {...register("description")} rows={5} />}
    </FormField>
  )
}
