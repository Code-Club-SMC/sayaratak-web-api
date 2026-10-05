import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { PasswordHint } from "@/components/app/password-hint"
import { PasswordInput } from "@/components/app/password-input"
import { ShellLink } from "@/components/app/shell-link"
import { SubmitButton } from "@/components/app/submit-button"
import { toast } from "@/components/ui/toast"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import { useResetPassword } from "../queries"
import { resetFormSchema, type ResetForm } from "../schemas"

const linkClass =
  "inline-flex min-h-11 items-center text-ui font-medium text-primary md:min-h-10"

export function ResetForm({ token }: { token?: string }) {
  const { t, locale } = useT()
  const router = useRouter()
  const reset = useResetPassword()
  const hintId = useId()
  const form = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    mode: "onTouched",
    defaultValues: { password: "" },
  })
  if (!token || reset.error?.code === "invalid_token")
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-body">
          {t("auth.reset_invalid")}
        </p>
        <ShellLink path="/auth/forgot" className={linkClass}>
          {t("auth.reset_request_new")}
        </ShellLink>
      </div>
    )
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(({ password }) =>
        reset.mutate(
          { token, password },
          {
            onSuccess: () => {
              toast.add({ title: t("toast.password_changed") })
              router.history.push(localeHref("/auth", locale))
            },
          }
        )
      )}
    >
      <div className="flex flex-col gap-2">
        <FormField
          label={t("auth.new_password_label")}
          error={form.formState.errors.password?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register("password")}
              size="lg"
              autoFocus
              autoComplete="new-password"
              aria-describedby={[control["aria-describedby"], hintId]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        </FormField>
        <PasswordHint id={hintId} value={form.watch("password")} />
      </div>
      {reset.isError && (
        <p role="alert" className="text-ui text-destructive">
          {t("auth.reset_error")}
        </p>
      )}
      <SubmitButton size="lg" pending={reset.isPending}>
        {t("auth.reset_submit")}
      </SubmitButton>
    </form>
  )
}
