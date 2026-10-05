import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { CitySelect } from "./city-select"
import { FormField } from "./form-field"

export type CityDistrictValue = { cityId: string; districtId: string | null }

// Changing the city clears the district, since districts belong to one city.
export function CityDistrictFields({
  value,
  onChange,
  cityError,
  districtError,
  districtRequired = false,
}: {
  value: CityDistrictValue
  onChange: (value: CityDistrictValue) => void
  cityError?: string
  districtError?: string
  districtRequired?: boolean
}) {
  const { t, locale } = useT()
  const { data } = useQuery(taxonomyQuery)
  const districts =
    data?.districts.filter((d) => d.cityId === value.cityId) ?? []
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CitySelect
        value={value.cityId}
        error={cityError}
        onChange={(cityId) => onChange({ cityId, districtId: null })}
      />
      <FormField
        label={t("form.district")}
        error={districtError}
        optional={!districtRequired}
      >
        {(control) => (
          <NativeSelect
            {...control}
            className="w-full"
            disabled={districts.length === 0}
            value={value.districtId ?? ""}
            onChange={(e) =>
              onChange({ ...value, districtId: e.target.value || null })
            }
          >
            <NativeSelectOption value="">
              {t("form.select_district")}
            </NativeSelectOption>
            {districts.map((d) => (
              <NativeSelectOption key={d.id} value={d.id}>
                {d.name[locale]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
    </div>
  )
}
