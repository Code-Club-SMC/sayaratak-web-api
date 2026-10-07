import { FormField } from "@/components/app/form-field"
import { NumberField } from "@/components/app/number-field"
import { SelectInput } from "@/components/app/select-input"
import { useT } from "@/lib/i18n/use-t"
import { fuelSchema, transmissionSchema } from "@/schemas/listing"
import { listingColors } from "../schemas"
import { ConditionField } from "./condition-field"
import { DetailsMakeModel } from "./details-make-model"
import { useStepFields } from "./use-step-fields"

const firstYear = 1970
const engineTypes = ["motorcycle", "tuk_tuk", "rickshaw"]
const row = "grid gap-4 sm:grid-cols-2"

// Details of a vehicle. Each vehicle type shows only the fields that mean something for it.
export function VehicleFields() {
  const { t } = useT()
  const { values, error, set } = useStepFields()
  const type: string | null = values.vehicleType
  const lastYear = new Date().getFullYear() + 1
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) =>
    String(lastYear - i)
  )
  return (
    <>
      <DetailsMakeModel vehicleType={values.vehicleType} />
      <div className={row}>
        <FormField label={t("form.year")} error={error("year")}>
          {(control) => (
            <SelectInput
              {...control}
              value={values.year == null ? "" : String(values.year)}
              placeholder={t("form.select_year")}
              options={years.map((y) => ({ value: y, label: y }))}
              onChange={(v) => set("year", v ? Number(v) : null)}
            />
          )}
        </FormField>
        <FormField label={t("form.fuel")} error={error("fuel")}>
          {(control) => (
            <SelectInput
              {...control}
              value={values.fuel ?? ""}
              placeholder={t("form.select_fuel")}
              options={fuelSchema.options.map((f) => ({
                value: f,
                label: t(`fuel.${f}`),
              }))}
              onChange={(v) => set("fuel", v || null)}
            />
          )}
        </FormField>
      </div>
      <ConditionField />
      {values.condition === "used" && (
        <FormField label={t("form.mileage")} error={error("mileageKm")}>
          {(control) => (
            <NumberField
              {...control}
              grouping
              min={0}
              value={values.mileageKm}
              onChange={(n) => set("mileageKm", n)}
            />
          )}
        </FormField>
      )}
      <div className={row}>
        {(type === "car" || type === "truck") && (
          <FormField
            label={t("form.transmission")}
            error={error("transmission")}
          >
            {(control) => (
              <SelectInput
                {...control}
                value={values.transmission ?? ""}
                placeholder={t("form.select_transmission")}
                options={transmissionSchema.options.map((x) => ({
                  value: x,
                  label: t(`transmission.${x}`),
                }))}
                onChange={(v) => set("transmission", v || null)}
              />
            )}
          </FormField>
        )}
        <FormField label={t("form.color")} optional error={error("color")}>
          {(control) => (
            <SelectInput
              {...control}
              value={values.color ?? ""}
              placeholder={t("form.select_color")}
              options={listingColors.map((c) => ({
                value: c,
                label: t(`color.${c}`),
              }))}
              onChange={(v) => set("color", v || null)}
            />
          )}
        </FormField>
        {engineTypes.includes(type ?? "") && (
          <FormField
            label={t("form.engine_cc")}
            optional
            error={error("engineCc")}
          >
            {(control) => (
              <NumberField
                {...control}
                grouping
                min={20}
                value={values.engineCc}
                onChange={(n) => set("engineCc", n)}
              />
            )}
          </FormField>
        )}
        {type === "truck" && (
          <FormField
            label={t("form.payload_tons")}
            optional
            error={error("payloadTons")}
          >
            {(control) => (
              <NumberField
                {...control}
                min={0}
                max={100}
                step={0.5}
                value={values.payloadTons}
                onChange={(n) => set("payloadTons", n)}
              />
            )}
          </FormField>
        )}
      </div>
    </>
  )
}
