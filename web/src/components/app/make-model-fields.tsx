import { useQuery } from "@tanstack/react-query"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import type { VehicleType } from "@/schemas/listing"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { FormField } from "./form-field"

export type MakeModelValue = {
  makeId: string | null
  modelId: string | null
  makeOther: string | null
  modelOther: string | null
}

const OTHER = "__other"

// "Other" is a non-null free-text field next to a null id, so the value matches the listing input schema as it is.
export function MakeModelFields({
  value,
  onChange,
  vehicleType,
  makeError,
  modelError,
  search = false,
  className = "grid gap-4 sm:grid-cols-2",
}: {
  value: MakeModelValue
  onChange: (value: MakeModelValue) => void
  vehicleType?: VehicleType | null
  makeError?: string
  modelError?: string
  // Search forms: no "Other", and the model select is always there, disabled until a make is picked.
  search?: boolean
  className?: string
}) {
  const { t, locale } = useT()
  const { data } = useQuery(taxonomyQuery)
  const makes =
    data?.makes.filter(
      (m) => !vehicleType || m.vehicleTypes.includes(vehicleType)
    ) ?? []
  const models = data?.models.filter((m) => m.makeId === value.makeId) ?? []
  const makeIsOther = value.makeOther !== null
  const modelIsOther = value.modelOther !== null
  const text = (
    label: string,
    key: "makeOther" | "modelOther",
    error?: string
  ) => (
    <FormField label={label} error={error}>
      {(control) => (
        <Input
          {...control}
          dir="auto"
          value={value[key] ?? ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        />
      )}
    </FormField>
  )
  return (
    <div className={className}>
      <FormField
        label={t("form.make")}
        error={makeIsOther ? undefined : makeError}
      >
        {(control) => (
          <NativeSelect
            {...control}
            className="w-full"
            value={makeIsOther ? OTHER : (value.makeId ?? "")}
            onChange={(e) => {
              const v = e.target.value
              onChange(
                v === OTHER
                  ? {
                      makeId: null,
                      modelId: null,
                      makeOther: "",
                      modelOther: "",
                    }
                  : {
                      makeId: v || null,
                      modelId: null,
                      makeOther: null,
                      modelOther: null,
                    }
              )
            }}
          >
            <NativeSelectOption value="">
              {t("form.select_make")}
            </NativeSelectOption>
            {makes.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>
                {m.name[locale]}
              </NativeSelectOption>
            ))}
            {!search && (
              <NativeSelectOption value={OTHER}>
                {t("form.other")}
              </NativeSelectOption>
            )}
          </NativeSelect>
        )}
      </FormField>
      {makeIsOther && text(t("form.make_name"), "makeOther", makeError)}
      {makeIsOther && text(t("form.model_name"), "modelOther", modelError)}
      {(value.makeId || search) && (
        <FormField
          label={t("form.model")}
          error={modelIsOther ? undefined : modelError}
        >
          {(control) => (
            <NativeSelect
              {...control}
              className="w-full"
              disabled={!value.makeId}
              value={modelIsOther ? OTHER : (value.modelId ?? "")}
              onChange={(e) => {
                const v = e.target.value
                onChange(
                  v === OTHER
                    ? { ...value, modelId: null, modelOther: "" }
                    : { ...value, modelId: v || null, modelOther: null }
                )
              }}
            >
              <NativeSelectOption value="">
                {t("form.select_model")}
              </NativeSelectOption>
              {models.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name[locale]}
                </NativeSelectOption>
              ))}
              {!search && (
                <NativeSelectOption value={OTHER}>
                  {t("form.other")}
                </NativeSelectOption>
              )}
            </NativeSelect>
          )}
        </FormField>
      )}
      {value.makeId &&
        modelIsOther &&
        text(t("form.model_name"), "modelOther", modelError)}
    </div>
  )
}
