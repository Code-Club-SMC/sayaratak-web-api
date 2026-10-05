import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { FormField } from "./form-field"

// A native select: light on low-end phones and the best picker on mobile. Options come from the taxonomy, which route loaders prefetch.
export function CitySelect({
  value,
  onChange,
  error,
  label,
  optional,
  disabled,
}: {
  value: string
  onChange: (cityId: string) => void
  error?: string
  label?: string
  optional?: boolean
  disabled?: boolean
}) {
  const { t, locale } = useT()
  const { data } = useQuery(taxonomyQuery)
  return (
    <FormField
      label={label ?? t("form.city")}
      error={error}
      optional={optional}
    >
      {(control) => (
        <NativeSelect
          {...control}
          className="w-full"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("form.select_city")}
          </NativeSelectOption>
          {data?.cities.map((city) => (
            <NativeSelectOption key={city.id} value={city.id}>
              {city.name[locale]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </FormField>
  )
}
