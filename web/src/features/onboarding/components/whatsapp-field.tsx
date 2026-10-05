import { useEffect, useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PhoneInput } from "@/components/app/phone-input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useT } from "@/lib/i18n/use-t"
import type { DealerLocation } from "../schemas"

// An optional WhatsApp number. "Same as first phone" mirrors the first phone until it is unticked.
export function WhatsappField() {
  const { t } = useT()
  const { control, setValue } = useFormContext<DealerLocation>()
  const first = useWatch({ control, name: "phones" })[0]?.value ?? ""
  const whatsapp = useWatch({ control, name: "whatsapp" })
  // Until the box is touched, a number equal to the first phone counts as "same".
  const [choice, setChoice] = useState<boolean>()
  const same = choice ?? (whatsapp !== "" && whatsapp === first)
  useEffect(() => {
    if (same) setValue("whatsapp", first)
  }, [same, first, setValue])
  return (
    <div className="flex flex-col gap-2">
      <Controller
        control={control}
        name="whatsapp"
        render={({ field, fieldState }) => (
          <FormField
            label={t("form.whatsapp")}
            error={fieldState.error?.message}
            optional
          >
            {(c) => (
              <PhoneInput
                {...c}
                disabled={same}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          </FormField>
        )}
      />
      <Label className="min-h-11 font-normal">
        <Checkbox checked={same} onCheckedChange={setChoice} />
        {t("form.same_as_phone")}
      </Label>
    </div>
  )
}
