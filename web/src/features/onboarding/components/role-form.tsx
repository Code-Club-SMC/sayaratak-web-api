import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useRouterState } from "@tanstack/react-router"
import {
  CarIcon,
  StoreIcon,
  UserRoundIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"
import { Controller } from "react-hook-form"

import { StepHeader } from "@/components/app/step-header"
import { StepIndicator } from "@/components/app/step-indicator"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { RadioGroup } from "@/components/ui/radio-group"
import { draftQuery, useSaveDraft } from "@/features/auth/queries"
import { useT } from "@/lib/i18n/use-t"
import { stepHref } from "../draft"
import { firstStepId, flows } from "../flows"
import { roleChoiceSchema, roleDraftKey, type RoleChoice } from "../schemas"
import { RoleOption } from "./role-option"
import { useAppForm } from "@/hooks/use-app-form"

const options: { role: RoleChoice["role"]; icon: LucideIcon }[] = [
  { role: "user", icon: CarIcon },
  { role: "dealership", icon: StoreIcon },
  { role: "workshop", icon: WrenchIcon },
  { role: "mechanic", icon: UserRoundIcon },
]

export function RoleForm({ redirect }: { redirect?: string }) {
  const { t, locale } = useT()
  const router = useRouter()
  const draft = useQuery(draftQuery(roleDraftKey))
  const save = useSaveDraft(roleDraftKey)
  // Coming back from step 1 keeps the saved choice; otherwise `user`. `values` also covers a draft that arrives after the first render.
  const saved = roleChoiceSchema.safeParse(draft.data?.data)
  const form = useAppForm<RoleChoice>({
    resolver: zodResolver(roleChoiceSchema),
    values: { role: saved.success ? saved.data.role : "user" },
  })
  // The button stays pending until the first step has loaded.
  const navigating = useRouterState({ select: (s) => s.status === "pending" })
  const submit = form.handleSubmit(({ role }) =>
    save.mutate(
      { role },
      {
        onSuccess: () =>
          router.history.push(
            stepHref(role, firstStepId(role), locale, redirect)
          ),
      }
    )
  )
  // Step 1 of the whole flow; the total follows the role picked so far.
  const total = flows[form.watch("role")].length + 1
  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={submit}>
      <StepIndicator current={1} total={total} labelFromMd />
      <StepHeader title={t("onboarding.role_title")} step="role" />
      <Controller
        control={form.control}
        name="role"
        render={({ field }) => (
          <RadioGroup
            aria-label={t("onboarding.role_title")}
            value={field.value}
            onValueChange={field.onChange}
          >
            {options.map(({ role, icon }) => (
              <RoleOption
                key={role}
                value={role}
                icon={icon}
                title={t(`onboarding.role_${role}_title`)}
                description={t(`onboarding.role_${role}_desc`)}
              />
            ))}
          </RadioGroup>
        )}
      />
      {save.isError && (
        <div className="flex flex-wrap items-center gap-x-3">
          <p role="alert" className="text-ui text-destructive">
            {t("onboarding.role_error")}
          </p>
          <Button type="button" variant="link" onClick={submit}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      <SubmitButton size="lg" pending={save.isPending || navigating}>
        {t("common.continue")}
      </SubmitButton>
    </form>
  )
}
