import { useFormContext, useWatch } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useT } from "@/lib/i18n/use-t"
import type { Bilingual } from "@/schemas/fields"

type Details = { name: Bilingual; description: Bilingual }
const langs = ["ar", "en"] as const

// Name and description in both languages: the public page shows the one that matches the visitor's language.
export function DetailsFields() {
  const { t } = useT()
  const { register, control, formState } = useFormContext<Details>()
  const description = useWatch({ control, name: "description" })
  const { errors } = formState
  return (
    <>
      {langs.map((lang) => (
        <FormField
          key={`name-${lang}`}
          label={t(`dashboard.profile_name_${lang}`)}
          error={errors.name?.[lang]?.message}
        >
          {(c) => (
            <Input
              {...c}
              {...register(`name.${lang}`)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              autoComplete="organization"
            />
          )}
        </FormField>
      ))}
      {langs.map((lang) => (
        <FormField
          key={`description-${lang}`}
          label={t(`dashboard.profile_about_${lang}`)}
          error={errors.description?.[lang]?.message}
          description={`${description[lang].length}/1000`}
        >
          {(c) => (
            <Textarea
              {...c}
              {...register(`description.${lang}`)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              rows={5}
            />
          )}
        </FormField>
      ))}
    </>
  )
}
