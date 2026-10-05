import { useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { ShellLink } from "@/components/app/shell-link"
import { SubmitButton } from "@/components/app/submit-button"
import { Input } from "@/components/ui/input"
import { useEnterKeyHints } from "@/hooks/use-enter-key-hints"
import { useT } from "@/lib/i18n/use-t"
import { useForgotPassword } from "../queries"
import { forgotFormSchema, type IdentifierForm } from "../schemas"

const linkClass =
  "inline-flex min-h-11 items-center text-ui font-medium text-primary md:min-h-10"

export function ForgotForm() {
  const { t } = useT()
  const forgot = useForgotPassword()
  const root = useRef<HTMLFormElement>(null)
  useEnterKeyHints(root, "done")
  const form = useForm<IdentifierForm>({
    resolver: zodResolver(forgotFormSchema),
    mode: "onTouched",
    defaultValues: { identifier: "" },
  })
  if (forgot.isSuccess)
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-body">
          {t("auth.forgot_sent")}
        </p>
        {import.meta.env.VITE_DEMO === "true" && (
          <p className="text-caption text-muted-foreground">
            {t("auth.forgot_demo_hint")}
          </p>
        )}
        <ShellLink path="/auth" className={linkClass}>
          {t("auth.back_to_sign_in")}
        </ShellLink>
      </div>
    )
  return (
    <form
      ref={root}
      noValidate
      data-reserve-errors
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((body) => forgot.mutate(body))}
    >
      <FormField
        label={t("auth.identifier_label")}
        error={form.formState.errors.identifier?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register("identifier")}
            size="lg"
            autoFocus
            autoComplete="username"
          />
        )}
      </FormField>
      {forgot.isError && (
        <p role="alert" className="text-ui text-destructive">
          {t("auth.forgot_error")}
        </p>
      )}
      <SubmitButton size="lg" pending={forgot.isPending}>
        {t("auth.forgot_submit")}
      </SubmitButton>
      <ShellLink path="/auth" className={linkClass}>
        {t("auth.back_to_sign_in")}
      </ShellLink>
    </form>
  )
}
