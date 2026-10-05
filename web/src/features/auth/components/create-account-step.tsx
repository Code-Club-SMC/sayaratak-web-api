import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PasswordHint } from "@/components/app/password-hint"
import { PasswordInput } from "@/components/app/password-input"
import { ShellLink } from "@/components/app/shell-link"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n/use-t"
import { useRegister } from "../queries"
import { createAccountSchema, type CreateAccountForm } from "../schemas"
import { IdentifierSummary } from "./identifier-summary"
import type { StepProps } from "./step-switch"

const linkClass =
  "inline-flex min-h-11 items-center text-ui font-medium text-primary underline md:min-h-10"

export function CreateAccountStep({ state, dispatch, onDone }: StepProps) {
  const { t } = useT()
  const register = useRegister()
  const hintId = useId()
  const form = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", password: "" },
  })
  const password = form.watch("password")
  const submit = form.handleSubmit((values) =>
    register.mutate(
      { identifier: state.identifier, ...values },
      {
        onSuccess: (user) =>
          state.kind === "phone" && import.meta.env.VITE_FEATURE_OTP === "true"
            ? dispatch({ type: "otp", from: "create", pendingUserId: user.id })
            : onDone(),
        // The identify step should prevent this; if the account appeared meanwhile, sign in instead.
        onError: (e) => {
          if (e.code === "exists")
            dispatch({
              type: "identified",
              identifier: state.identifier,
              normalizedIdentifier: state.normalizedIdentifier,
              kind: state.kind,
              exists: true,
            })
        },
      }
    )
  )
  const failed = register.isError && register.error.code !== "exists"
  return (
    <div className="flex flex-col gap-4">
      <IdentifierSummary
        value={state.identifier}
        onChange={() => dispatch({ type: "back" })}
      />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t("auth.full_name_label")}
          error={form.formState.errors.fullName?.message}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register("fullName")}
              size="lg"
              autoComplete="name"
            />
          )}
        </FormField>
        <div className="flex flex-col gap-2">
          <FormField
            label={t("auth.password_label")}
            error={form.formState.errors.password?.message}
          >
            {(control) => (
              <PasswordInput
                {...control}
                {...form.register("password")}
                size="lg"
                autoComplete="new-password"
                aria-describedby={[control["aria-describedby"], hintId]
                  .filter(Boolean)
                  .join(" ")}
              />
            )}
          </FormField>
          <PasswordHint id={hintId} value={password} />
        </div>
        {failed && (
          <p role="alert" className="text-ui text-destructive">
            {t("auth.register_error")}
          </p>
        )}
        <SubmitButton size="lg" pending={register.isPending}>
          {t("auth.create_account")}
        </SubmitButton>
      </form>
      <p className="flex flex-wrap items-center gap-x-1 text-caption text-muted-foreground">
        {t("auth.terms_notice")}
        <ShellLink path="/terms" className={linkClass} newTab>
          {t("nav.terms")}
        </ShellLink>
        {t("auth.terms_and")}
        <ShellLink path="/privacy" className={linkClass} newTab>
          {t("nav.privacy")}
        </ShellLink>
      </p>
    </div>
  )
}
