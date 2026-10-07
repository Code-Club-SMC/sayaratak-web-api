import { MakeModelFields } from "@/components/app/make-model-fields"
import type { VehicleType } from "@/schemas/listing"
import { useStepFields } from "./use-step-fields"

// Make and model of the details step, stored as four plain fields of the one form.
export function DetailsMakeModel({
  vehicleType,
}: {
  vehicleType?: VehicleType | null
}) {
  const { values, error, set } = useStepFields()
  return (
    <MakeModelFields
      vehicleType={vehicleType}
      value={{
        makeId: values.makeId,
        modelId: values.modelId,
        makeOther: values.makeOther,
        modelOther: values.modelOther,
      }}
      onChange={(next) => {
        for (const [field, value] of Object.entries(next)) set(field, value)
      }}
      makeError={error("makeId") ?? error("makeOther")}
      modelError={error("modelId") ?? error("modelOther")}
    />
  )
}
