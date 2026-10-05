import { Controller, useFormContext } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { LocationPicker } from "@/components/app/location-picker"
import { PhoneList } from "@/components/app/phone-list"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n/use-t"
import type { DealerLocation } from "../schemas"
import { WhatsappField } from "./whatsapp-field"

export function DealerLocationStep() {
  const { t } = useT()
  const { control, register, setValue, watch, formState } =
    useFormContext<DealerLocation>()
  const { errors, isSubmitted } = formState
  const set = { shouldValidate: isSubmitted }
  return (
    <>
      <LocationPicker
        districtRequired
        value={{
          cityId: watch("cityId"),
          districtId: watch("districtId") || null,
          location: watch("location"),
        }}
        cityError={errors.cityId?.message}
        districtError={errors.districtId?.message}
        onChange={(place) => {
          setValue("cityId", place.cityId, set)
          setValue("districtId", place.districtId ?? "", set)
          setValue("location", place.location, set)
        }}
      />
      <FormField label={t("form.address")} error={errors.address?.message}>
        {(c) => (
          <Input
            {...c}
            {...register("address")}
            size="lg"
            autoComplete="street-address"
          />
        )}
      </FormField>
      <Controller
        control={control}
        name="phones"
        render={({ field }) => (
          <PhoneList
            value={field.value}
            onChange={field.onChange}
            errors={field.value.map(
              (_, i) => errors.phones?.[i]?.value?.message
            )}
          />
        )}
      />
      <WhatsappField />
    </>
  )
}
