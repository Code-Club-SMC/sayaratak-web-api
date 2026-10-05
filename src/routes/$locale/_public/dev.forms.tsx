import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import {
  geoSchema,
  optionalInt,
  passwordSchema,
  phoneSchema,
  priceSchema,
  requiredText,
  weeklyHoursSchema,
} from "@/schemas/fields"
import { CheckboxGroup } from "@/components/app/checkbox-group"
import { ChipMultiSelect } from "@/components/app/chip-multi-select"
import { ChipSingleSelect } from "@/components/app/chip-single-select"
import { FormField } from "@/components/app/form-field"
import { FormSection } from "@/components/app/form-section"
import { LocationPicker } from "@/components/app/location-picker"
import { MakeModelFields } from "@/components/app/make-model-fields"
import { NotFound } from "@/components/app/not-found"
import { NumberField } from "@/components/app/number-field"
import { PasswordInput } from "@/components/app/password-input"
import { PhoneInput } from "@/components/app/phone-input"
import { PriceFields } from "@/components/app/price-fields"
import { StepIndicator } from "@/components/app/step-indicator"
import { SubmitButton } from "@/components/app/submit-button"
import { WeeklyHoursEditor } from "@/components/app/weekly-hours-editor"
import { Input } from "@/components/ui/input"

// Development-only demo for step 4.3, so the strings are plain English. Production returns 404. Remove in step 4.7.
export const Route = createFileRoute("/$locale/_public/dev/forms")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: FormsDemo,
})

const schema = z
  .object({
    name: requiredText(40),
    password: passwordSchema,
    phone: phoneSchema,
    mileage: optionalInt(0, 5_000_000),
    price: priceSchema,
    negotiable: z.boolean(),
    makeId: z.string().nullable(),
    modelId: z.string().nullable(),
    makeOther: z.string().nullable(),
    modelOther: z.string().nullable(),
    cityId: z.string().min(1, "validation.required"),
    districtId: z.string().nullable(),
    location: geoSchema.nullable(),
    fuel: z.string().min(1, "validation.required"),
    features: z.array(z.string()).min(1, "validation.select_min"),
    methods: z.array(z.string()).min(1, "validation.contact_required"),
    hours: weeklyHoursSchema,
  })
  .refine((v) => v.makeId || v.makeOther, {
    message: "validation.required",
    path: ["makeId"],
  })

const days = Array.from({ length: 7 }, (_, day) => ({
  day,
  closed: day === 5,
  open: "08:00",
  close: "17:00",
}))
const opt = (...values: string[]) =>
  values.map((value) => ({ value, label: value }))

function FormsDemo() {
  const [sent, setSent] = useState("")
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      password: "",
      phone: "",
      negotiable: false,
      makeId: null,
      modelId: null,
      makeOther: null,
      modelOther: null,
      cityId: "",
      districtId: null,
      location: null,
      fuel: "",
      features: [],
      methods: [],
      hours: days,
    },
  })
  const { control } = form
  const err = (e?: { message?: string }) => e?.message
  return (
    <form
      className="flex max-w-2xl flex-col gap-8 py-12"
      onSubmit={form.handleSubmit((v) => setSent(JSON.stringify(v, null, 2)))}
    >
      <h1 className="text-page font-semibold">Form blocks demo</h1>
      <StepIndicator current={2} total={5} />
      <FormSection title="Basics">
        <FormField label="Name" error={err(form.formState.errors.name)}>
          {(c) => <Input {...c} {...form.register("name")} />}
        </FormField>
        <FormField label="Password" error={err(form.formState.errors.password)}>
          {(c) => <PasswordInput {...c} {...form.register("password")} />}
        </FormField>
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <FormField label="Phone" error={err(fieldState.error)}>
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
        <Controller
          control={control}
          name="mileage"
          render={({ field, fieldState }) => (
            <FormField
              label="Mileage (km)"
              optional
              error={err(fieldState.error)}
            >
              {(c) => (
                <NumberField
                  {...c}
                  min={0}
                  step={500}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            </FormField>
          )}
        />
      </FormSection>
      <FormSection title="Vehicle">
        <Controller
          control={control}
          name="price"
          render={({ field, fieldState }) => (
            <PriceFields
              error={err(fieldState.error)}
              value={{
                price: typeof field.value === "number" ? field.value : null,
                negotiable: form.watch("negotiable"),
              }}
              onChange={(v) => {
                field.onChange(v.price)
                form.setValue("negotiable", v.negotiable)
              }}
            />
          )}
        />
        <MakeModelFields
          value={{
            makeId: form.watch("makeId"),
            modelId: form.watch("modelId"),
            makeOther: form.watch("makeOther"),
            modelOther: form.watch("modelOther"),
          }}
          makeError={err(form.formState.errors.makeId)}
          onChange={(v) => {
            for (const [k, x] of Object.entries(v))
              form.setValue(k as keyof typeof v, x, {
                shouldValidate: form.formState.isSubmitted,
              })
          }}
        />
        <Controller
          control={control}
          name="fuel"
          render={({ field, fieldState }) => (
            <ChipSingleSelect
              legend="Fuel"
              options={opt("Petrol", "Diesel", "Hybrid")}
              value={field.value || null}
              onChange={field.onChange}
              error={err(fieldState.error)}
            />
          )}
        />
        <Controller
          control={control}
          name="features"
          render={({ field, fieldState }) => (
            <ChipMultiSelect
              legend="Features"
              options={opt("AC", "ABS", "Sunroof", "Leather")}
              value={field.value}
              onChange={field.onChange}
              error={err(fieldState.error)}
            />
          )}
        />
        <Controller
          control={control}
          name="methods"
          render={({ field, fieldState }) => (
            <CheckboxGroup
              legend="Contact methods"
              options={opt("call", "whatsapp", "chat")}
              value={field.value}
              onChange={field.onChange}
              error={err(fieldState.error)}
            />
          )}
        />
      </FormSection>
      <FormSection title="Location">
        <LocationPicker
          value={{
            cityId: form.watch("cityId"),
            districtId: form.watch("districtId"),
            location: form.watch("location"),
          }}
          cityError={err(form.formState.errors.cityId)}
          onChange={(v) => {
            form.setValue("cityId", v.cityId, {
              shouldValidate: form.formState.isSubmitted,
            })
            form.setValue("districtId", v.districtId)
            form.setValue("location", v.location)
          }}
        />
      </FormSection>
      <FormSection title="Opening hours">
        <Controller
          control={control}
          name="hours"
          render={({ field, fieldState }) => (
            <WeeklyHoursEditor
              value={field.value}
              onChange={field.onChange}
              error={err(fieldState.error) ?? err(fieldState.error?.root)}
            />
          )}
        />
      </FormSection>
      <SubmitButton pending={form.formState.isSubmitting}>Submit</SubmitButton>
      {sent && (
        <pre className="overflow-auto text-caption" dir="ltr">
          {sent}
        </pre>
      )}
    </form>
  )
}
