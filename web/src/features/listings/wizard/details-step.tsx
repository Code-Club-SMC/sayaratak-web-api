import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFormContext } from "react-hook-form"

import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import { CommonFields } from "./common-fields"
import { PartFields } from "./part-fields"
import { useStepFields } from "./use-step-fields"
import { VehicleFields } from "./vehicle-fields"

// The title starts as "{make} {model} {year}" and follows those fields until the person edits it.
function useTitleSuggestion() {
  const { locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const { getValues } = useFormContext()
  const { values, set } = useStepFields()
  const make =
    tax?.makes.find((m) => m.id === values.makeId)?.name[locale] ??
    values.makeOther
  const model =
    tax?.models.find((m) => m.id === values.modelId)?.name[locale] ??
    values.modelOther
  const suggestion =
    values.kind === "vehicle"
      ? [make, model, values.year].filter(Boolean).join(" ")
      : ""
  const last = useRef(suggestion)
  useEffect(() => {
    if (suggestion === last.current) return
    const title = getValues("title")
    if (title === "" || title === last.current) set("title", suggestion)
    last.current = suggestion
  }, [suggestion])
}

// Step `details`: the fields of the chosen type, then title, description and price.
export function DetailsStep() {
  const { values } = useStepFields()
  useTitleSuggestion()
  return (
    <>
      {values.kind === "part" ? <PartFields /> : <VehicleFields />}
      <CommonFields />
    </>
  )
}
