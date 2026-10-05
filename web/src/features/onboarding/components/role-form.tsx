import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import {
  CarIcon,
  StoreIcon,
  UserRoundIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { StepHeader } from "@/components/app/step-header"
import { SubmitButton } from "@/components/app/submit-button"
import { RadioGroup } from "@/components/ui/radio-group"
import { draftQuery, useSaveDraft } from "@/features/auth/queries"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import {
  firstStep,
  roleChoiceSchema,
  roleDraftKey,
  type RoleChoice,
} from "../schemas"
import { RoleOption } from "./role-option"

const options: { role: RoleChoice["role"]; icon: LucideIcon }[] = [
  { role: "user", icon: CarIcon },
  { role: "dealership", icon: StoreIcon },
  { role: "workshop", icon: WrenchIcon },
  { role: "mechanic", icon: UserRoundIcon },
]

export function RoleForm() {
  const { t, locale } = useT()
  const router = useRouter()
  const draft = useQuery(draftQuery(roleDraftKey))
  const save = useSaveDraft(roleDraftKey)
  // Coming back from step 1 keeps the saved choice; otherwise `user`. `values` also covers a draft that arrives after the first render.
  const saved = roleChoiceSchema.safeParse(draft.data?.data)
  const form = useForm<RoleChoice>({
    resolver: zodResolver(roleChoiceSchema),
    values: { role: saved.success ? saved.data.role : "user" },
  })
  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={form.handleSubmit(({ role }) =>
        save.mutate(
          { role },
          {
            onSuccess: () =>
              router.history.push(
                localeHref(`/onboarding/${role}/${firstStep[role]}`, locale)
              ),
          }
        )
      )}
    >
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
        <p role="alert" className="text-ui text-destructive">
          {t("onboarding.role_error")}
        </p>
      )}
      <SubmitButton size="lg" pending={save.isPending}>
        {t("common.continue")}
      </SubmitButton>
    </form>
  )
}
