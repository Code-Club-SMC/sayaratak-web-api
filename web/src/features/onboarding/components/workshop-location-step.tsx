import { Controller, useFormContext } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PhoneInput } from "@/components/app/phone-input"
import { useT } from "@/lib/i18n/use-t"
import type { WorkshopLocation } from "../schemas"
import { PlaceFields } from "./place-fields"
import { WhatsappField } from "./whatsapp-field"

export function WorkshopLocationStep() {
  const { t } = useT()
  const { control, watch } = useFormContext<WorkshopLocation>()
  return (
    <>
      <PlaceFields />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <FormField label={t("form.phone")} error={fieldState.error?.message}>
            {(c) => (
              <PhoneInput
                {...c}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          </FormField>
        )}
      />
      <WhatsappField first={watch("phone")} />
    </>
  )
}
