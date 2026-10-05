import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { FormProvider, useForm, type FieldValues } from "react-hook-form"
import { z } from "zod"

import { StepHeader } from "@/components/app/step-header"
import { StickyFooter } from "@/components/app/sticky-footer"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { withRedirect } from "@/features/auth/destination"
import { draftQuery, useSaveDraft } from "@/features/auth/queries"
import { meQuery } from "@/features/auth/me-query"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import { useCompleteOnboarding } from "../queries"
import { flatValues, stepValues, type DraftData } from "../draft"
import { flows, type FlowStep } from "../flows"
import { onboardingDraftKey, type OnboardingRole } from "../schemas"
import { OnboardingLayout } from "./onboarding-layout"
import { PreviewSheetButton } from "./preview-sheet-button"
import { StepPreview } from "./step-preview"

const noSchema = z.object({})

// One page for every step of a flow. `steps` is a prop only so tests can run a small flow.
export function OnboardingStepPage({
  role,
  stepId,
  steps = flows[role],
  redirect,
}: {
  role: OnboardingRole
  stepId: string
  steps?: FlowStep[]
  // Where to land after the last step instead of the dashboard (set when sign in sent a new account here).
  redirect?: string
}) {
  const { t, locale } = useT()
  const router = useRouter()
  const key = onboardingDraftKey(role)
  const data = useQuery(draftQuery(key)).data?.data ?? {}
  const me = useQuery(meQuery).data
  const save = useSaveDraft(key)
  const complete = useCompleteOnboarding()
  const index = steps.findIndex((s) => s.id === stepId)
  const step = steps[index]
  const form = useForm<FieldValues>({
    resolver: zodResolver(step?.schema ?? noSchema),
    values: { ...(me && step?.defaults?.(me)), ...stepValues(data, stepId) },
  })
  // The router keeps the page mounted between steps, so it does not scroll by itself.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [stepId])
  if (!step) return null

  const next = steps[index + 1]
  const prev = steps[index - 1]
  const go = (path: string) => router.history.push(localeHref(path, locale))
  const goStep = (path: string) => go(withRedirect(path, redirect))
  const finish = (all: DraftData) =>
    complete.mutate(
      { role, payload: flatValues(steps, all) },
      { onSuccess: () => go(redirect ?? `${dashboardPath(role)}?welcome=1`) }
    )
  const advance = (all: DraftData) =>
    next ? goStep(`/onboarding/${role}/${next.id}`) : finish(all)
  const draftWith = (values: FieldValues) => ({ ...data, [step.id]: values })
  // Back and Save and exit leave at once; the save carries on in the background.
  const back = () => {
    save.mutate(draftWith(form.getValues()))
    goStep(prev ? `/onboarding/${role}/${prev.id}` : "/onboarding/role")
  }
  const exit = () => {
    if (step.schema.safeParse(form.getValues()).success)
      save.mutate(draftWith(form.getValues()))
    go("/")
  }
  const preview =
    role === "user" ? null : (
      <StepPreview role={role} steps={steps} stepId={step.id} data={data} />
    )

  return (
    <FormProvider {...form}>
      <OnboardingLayout
        progress={{ current: index + 1, total: steps.length }}
        preview={preview}
        onExit={exit}
      >
        <StepHeader
          title={t(step.titleKey)}
          helper={t(step.helperKey)}
          step={step.id}
        />
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            save.mutate(draftWith(values), {
              onSuccess: (saved) => advance(saved.data),
            })
          )}
        >
          <step.Component key={step.id} />
          {(save.isError || complete.isError) && (
            <p role="alert" className="text-ui text-destructive">
              {t("onboarding.save_error")}
            </p>
          )}
          <StickyFooter
            onBack={back}
            skip={
              <>
                {preview && <PreviewSheetButton>{preview}</PreviewSheetButton>}
                {step.optional && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => advance(data)}
                  >
                    {t("common.skip")}
                  </Button>
                )}
              </>
            }
          >
            <SubmitButton
              size="lg"
              pending={save.isPending || complete.isPending}
            >
              {next ? t("common.next") : t(`onboarding.finish_${role}`)}
            </SubmitButton>
          </StickyFooter>
        </form>
      </OnboardingLayout>
    </FormProvider>
  )
}
