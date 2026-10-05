import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PasswordInput } from "@/components/app/password-input"
import { ShellLink } from "@/components/app/shell-link"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { closeAuthGate } from "../auth-gate"
import { useLogin } from "../queries"
import { passwordFormSchema, type PasswordForm } from "../schemas"
import { IdentifierSummary } from "./identifier-summary"
import type { StepProps } from "./step-switch"

const linkClass =
  "inline-flex min-h-11 items-center text-ui font-medium text-primary md:min-h-10"

export function PasswordStep({ state, dispatch, onDone, mode }: StepProps) {
  const { t } = useT()
  const login = useLogin()
  const [seconds, setSeconds] = useState(0)
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    mode: "onTouched",
    defaultValues: { password: "" },
  })
  useEffect(() => {
    if (seconds <= 0) return
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [seconds])
  const code = login.error?.code
  const locked = code === "too_many_attempts" && seconds > 0
  const submit = form.handleSubmit(({ password }) =>
    login.mutate(
      { identifier: state.identifier, password },
      {
        onSuccess: onDone,
        onError: (e) => {
          if (e.code === "invalid_credentials") {
            form.resetField("password")
            form.setFocus("password")
          }
          if (e.code === "too_many_attempts") setSeconds(e.retryAfter ?? 60)
        },
      }
    )
  )
  const message = locked
    ? t("auth.too_many_attempts", { seconds })
    : code === "invalid_credentials"
      ? t("auth.invalid_credentials")
      : code === "banned"
        ? t("auth.account_suspended")
        : code && code !== "too_many_attempts"
          ? t("auth.login_error")
          : undefined
  return (
    <div className="flex flex-col gap-4">
      <IdentifierSummary
        value={state.identifier}
        onChange={() => dispatch({ type: "back" })}
      />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t("auth.password_label")}
          error={form.formState.errors.password?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register("password")}
              size="lg"
              autoComplete="current-password"
              disabled={locked}
            />
          )}
        </FormField>
        {message && (
          <p role="alert" className="text-ui text-destructive">
            {message}{" "}
            {code === "banned" && (
              <ShellLink path="/contact" className={linkClass}>
                {t("auth.contact_support")}
              </ShellLink>
            )}
          </p>
        )}
        <ShellLink
          path="/auth/forgot"
          className={`${linkClass} self-start`}
          onClick={mode === "dialog" ? closeAuthGate : undefined}
        >
          {t("auth.forgot_password")}
        </ShellLink>
        <SubmitButton size="lg" pending={login.isPending} disabled={locked}>
          {t("common.sign_in")}
        </SubmitButton>
      </form>
      {import.meta.env.VITE_FEATURE_OTP === "true" && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => dispatch({ type: "otp", from: "password" })}
        >
          {t("auth.send_code_instead")}
        </Button>
      )}
    </div>
  )
}
