import { Controller, useFormContext } from "react-hook-form"

import { CoverUpload } from "@/components/app/cover-upload"
import { FormField } from "@/components/app/form-field"
import { LogoUpload } from "@/components/app/logo-upload"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n/use-t"
import { mediaFromId } from "../media"
import type { DealerBusiness } from "../schemas"
import { DescriptionField } from "./description-field"

export function DealerBusinessStep() {
  const { t } = useT()
  const { control, register, formState } = useFormContext<DealerBusiness>()
  return (
    <>
      <FormField
        label={t("onboarding.dealer_name_label")}
        error={formState.errors.name?.message}
      >
        {(c) => (
          <Input
            {...c}
            {...register("name")}
            size="lg"
            autoComplete="organization"
          />
        )}
      </FormField>
      <DescriptionField label={t("onboarding.dealer_about_label")} />
      <Controller
        control={control}
        name="logoId"
        render={({ field }) => (
          <LogoUpload
            label={t("onboarding.logo_label")}
            value={field.value ? mediaFromId(field.value) : null}
            onChange={(media) => field.onChange(media?.id)}
          />
        )}
      />
      <Controller
        control={control}
        name="coverId"
        render={({ field }) => (
          <CoverUpload
            label={t("onboarding.cover_label")}
            value={field.value ? mediaFromId(field.value) : null}
            onChange={(media) => field.onChange(media?.id)}
          />
        )}
      />
    </>
  )
}
