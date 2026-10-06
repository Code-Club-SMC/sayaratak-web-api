import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@tanstack/react-router"
import { SearchIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { CitySelect } from "@/components/app/city-select"
import { FormField } from "@/components/app/form-field"
import { MakeModelFields } from "@/components/app/make-model-fields"
import { NumberField } from "@/components/app/number-field"
import { SubmitButton } from "@/components/app/submit-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { searchPath } from "@/features/search/href"
import { setCookie } from "@/lib/cookie"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import { intentSchema } from "@/schemas/listing"
import { heroSearchSchema, type HeroSearch as HeroValues } from "../schemas"

const YEAR = 365 * 24 * 60 * 60
const choice =
  "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90"

// The search card, with the page heading: vehicles or parts, buy or rent, city, make, model and the highest price. It builds the search URL and goes there; nothing is stored but the city, which the home and search pages remember.
export function HeroSearch({ city }: { city: string }) {
  const { t, locale } = useT()
  const router = useRouter()
  const { control, handleSubmit, watch, setValue, formState } =
    useForm<HeroValues>({
      resolver: zodResolver(heroSearchSchema),
      mode: "onTouched",
      defaultValues: {
        kind: "vehicle",
        intent: "sale",
        city,
        make: "",
        model: "",
        maxPrice: null,
      },
    })
  const kind = watch("kind")

  const go = (v: HeroValues) =>
    router.history.push(
      localeHref(
        searchPath({
          kind: v.kind,
          intent: v.kind === "vehicle" ? v.intent : undefined,
          city: v.city || undefined,
          make: v.make || undefined,
          model: v.model || undefined,
          maxPrice: v.maxPrice ?? undefined,
        }),
        locale
      )
    )

  return (
    <form
      noValidate
      onSubmit={handleSubmit(go)}
      aria-labelledby="home-title"
      className="rounded-2xl bg-card p-4 pb-5 md:p-8"
    >
      <h1
        id="home-title"
        className="mb-4 text-page font-semibold md:mb-6 md:text-hero"
      >
        {t("home.title")}
      </h1>
      <Tabs
        value={kind}
        onValueChange={(v) =>
          setValue("kind", v === "part" ? "part" : "vehicle")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="vehicle">{t("home.tab_vehicles")}</TabsTrigger>
            <TabsTrigger value="part">{t("home.tab_parts")}</TabsTrigger>
          </TabsList>
          {kind === "vehicle" && (
            <Controller
              control={control}
              name="intent"
              render={({ field }) => (
                <ToggleGroup
                  aria-label={t("home.intent")}
                  spacing={1}
                  value={[field.value ?? "sale"]}
                  onValueChange={(next) => {
                    // A group of two never goes empty: pressing the chosen one again keeps it.
                    const intent = intentSchema.safeParse(next[0])
                    if (intent.success) field.onChange(intent.data)
                  }}
                >
                  <ToggleGroupItem value="sale" className={choice}>
                    {t("home.buy")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="rent" className={choice}>
                    {t("home.rent")}
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          )}
        </div>
        <TabsContent value={kind} tabIndex={-1}>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end [&_[data-slot=select-trigger]]:h-12! [&_[data-slot=select-trigger]]:text-ui! [&_input]:h-12">
            <div className="col-span-2 lg:col-span-1">
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <CitySelect
                    value={field.value ?? ""}
                    onChange={(id) => {
                      field.onChange(id)
                      if (id) setCookie("city", id, YEAR)
                    }}
                  />
                )}
              />
            </div>
            <MakeModelFields
              search
              className="contents"
              value={{
                makeId: watch("make") || null,
                modelId: watch("model") || null,
                makeOther: null,
                modelOther: null,
              }}
              onChange={(v) => {
                setValue("make", v.makeId ?? "")
                setValue("model", v.modelId ?? "")
              }}
            />
            <div className="col-span-2 lg:col-span-1">
              <Controller
                control={control}
                name="maxPrice"
                render={({ field }) => (
                  <FormField
                    label={t("search.max_price")}
                    error={formState.errors.maxPrice?.message}
                  >
                    {(c) => (
                      <NumberField
                        {...c}
                        grouping
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  </FormField>
                )}
              />
            </div>
            <SubmitButton
              size="lg"
              pending={formState.isSubmitting}
              className="col-span-2 h-12 w-full lg:col-span-1 lg:w-auto lg:px-8"
            >
              <SearchIcon data-icon="inline-start" />
              {t("common.search")}
            </SubmitButton>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}
