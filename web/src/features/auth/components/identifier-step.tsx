import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/app/form-field"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import {
  identifierKind,
  looksLikePhone,
  normalizeIdentifier,
} from "../identifier"
import { useIdentify, useOauthLogin } from "../queries"
import { identifierFormSchema, type IdentifierForm } from "../schemas"
import { DemoAccounts } from "./demo-accounts"
import { SocialButtons } from "./social-buttons"
import type { StepProps } from "./step-switch"

export function IdentifierStep({ state, dispatch, onDone, mode }: StepProps) {
  const { t } = useT()
  const identify = useIdentify()
  const oauth = useOauthLogin()
  const form = useForm<IdentifierForm>({
    resolver: zodResolver(identifierFormSchema),
    mode: "onTouched",
    defaultValues: { identifier: state.identifier },
  })
  const value = form.watch("identifier")
  const phone = value !== "" && looksLikePhone(value)
  const submit = form.handleSubmit(({ identifier }) =>
    identify.mutate(
      { identifier },
      {
        onSuccess: ({ exists }) =>
          dispatch({
            type: "identified",
            identifier,
            normalizedIdentifier: normalizeIdentifier(identifier),
            kind: identifierKind(identifier),
            exists,
          }),
      }
    )
  )
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t("auth.identifier_label")}
          error={form.formState.errors.identifier?.message}
        >
          {(control) => (
            <div className="flex gap-2" dir={phone ? "ltr" : undefined}>
              {phone && !value.trim().startsWith("+") && (
                <span className="flex h-12 items-center rounded-lg bg-muted px-3 text-ui">
                  +249
                </span>
              )}
              <Input
                {...control}
                {...form.register("identifier")}
                size="lg"
                autoFocus={mode === "page"}
                autoComplete="username"
                inputMode={phone ? "tel" : value ? "email" : "text"}
              />
            </div>
          )}
        </FormField>
        {identify.isError && (
          <p role="alert" className="text-ui text-destructive">
            {t("auth.identify_error")}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <SubmitButton size="lg" pending={identify.isPending}>
            {t("common.continue")}
          </SubmitButton>
          {identify.isError && (
            <Button type="button" variant="ghost" onClick={submit}>
              {t("common.retry")}
            </Button>
          )}
        </div>
      </form>
      <div className="flex items-center gap-3 text-ui text-muted-foreground">
        <Separator className="flex-1" />
        {t("auth.or")}
        <Separator className="flex-1" />
      </div>
      <SocialButtons
        disabled={oauth.isPending}
        // Stand-in until 5.6 adds the account chooser: signs in a fixed mock account.
        onSelect={(provider) =>
          oauth.mutate(
            { provider, accountId: "Sara Ahmed" },
            {
              onSuccess: onDone,
              onError: (e) => toast.add({ title: errorText(t, e) }),
            }
          )
        }
      />
      <DemoAccounts onDone={onDone} />
    </div>
  )
}
