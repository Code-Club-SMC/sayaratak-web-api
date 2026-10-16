import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller } from "react-hook-form"

import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import type { Settings } from "@/schemas/admin"
import { useUpdateSettings } from "@/features/admin/queries"
import { FormField } from "@/components/app/form-field"
import { NumberField } from "@/components/app/number-field"
import { SubmitButton } from "@/components/app/submit-button"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { useAppForm } from "@/hooks/use-app-form"
import {
  individualSettingsSchema,
  type IndividualSettingsForm as Values,
} from "../schemas"

// Saved together with one button. Turning subscriptions off takes the limit meter off every individual's dashboard; the free limit is also what the Free plan shows.
export function IndividualSettingsForm({ settings }: { settings: Settings }) {
  const { t } = useT()
  const id = useId()
  const update = useUpdateSettings()
  const form = useAppForm<Values>({
    resolver: zodResolver(individualSettingsSchema),
    mode: "onTouched",
    defaultValues: {
      individualSubscriptionsEnabled: settings.individualSubscriptionsEnabled,
      freeListingLimit: settings.freeListingLimit,
    },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: () => toast.add({ title: t("admin.plans_settings_saved") }),
      onError: (e) => toast.add({ title: errorText(t, e) }),
    })
  )
  return (
    <form noValidate onSubmit={submit} className="flex max-w-lg flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span id={`${id}-on`} className="text-ui font-medium">
            {t("admin.plans_individual_on")}
          </span>
          <span
            id={`${id}-on-hint`}
            className="text-caption text-muted-foreground"
          >
            {t("admin.plans_individual_on_hint")}
          </span>
        </div>
        <Controller
          control={form.control}
          name="individualSubscriptionsEnabled"
          render={({ field }) => (
            <Switch
              aria-labelledby={`${id}-on`}
              aria-describedby={`${id}-on-hint`}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <FormField
        label={t("admin.plans_free_limit")}
        description={t("admin.plans_free_limit_hint")}
        error={errors.freeListingLimit?.message}
      >
        {(control) => (
          <Controller
            control={form.control}
            name="freeListingLimit"
            render={({ field }) => (
              <NumberField
                {...control}
                className="w-32"
                min={0}
                max={100}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        )}
      </FormField>
      <div>
        <SubmitButton pending={update.isPending}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  )
}
