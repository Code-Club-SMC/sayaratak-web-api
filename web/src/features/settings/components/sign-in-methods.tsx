import { useQuery } from "@tanstack/react-query"
import { useSearch } from "@tanstack/react-router"
import { MailIcon } from "lucide-react"

import { BrandIcon } from "@/components/app/brand-icon"
import { RemoveButton } from "@/components/app/remove-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { allProviders, isLive } from "@/features/auth/components/social-buttons"
import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import { accountsQuery, useLinkSocial, useUnlinkSocial } from "../queries"

// Ways to sign in: email + password, then each social provider with Connect or Remove. The last one left has no Remove (Better-Auth refuses it too).
export function SignInMethods({ lastUsed }: { lastUsed?: string }) {
  const { t } = useT()
  const search = useSearch({ strict: false })
  const accounts = useQuery(accountsQuery)
  const link = useLinkSocial()
  const unlink = useUnlinkSocial()
  if (!accounts.data) return <Skeleton className="h-24 w-full" />
  const linked = accounts.data.map((account) => account.providerId)
  const rowId = (provider: string) =>
    accounts.data.find((account) => account.providerId === provider)?.id
  const error = link.error ?? unlink.error
  const badge = (method: string) =>
    lastUsed === method && (
      <Badge variant="primary">{t("auth.last_used")}</Badge>
    )
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-ui font-medium">{t("settings.methods_title")}</h3>
      <ul className="flex flex-col gap-3">
        {linked.includes("credential") && (
          <li className="flex min-h-9 items-center gap-2">
            <MailIcon aria-hidden="true" className="size-4" />
            <span className="text-ui">{t("settings.method_email")}</span>
            {badge("email")}
          </li>
        )}
        {allProviders.map((provider) => {
          const name = t(`settings.method_${provider}`)
          const id = rowId(provider)
          const connected = id !== undefined
          return (
            <li key={provider} className="flex min-h-9 items-center gap-2">
              <BrandIcon name={provider} />
              <span className="text-ui">{name}</span>
              {connected ? badge(provider) : null}
              <span className="ms-auto">
                {!connected && !isLive(provider) ? (
                  <Badge>{t("settings.method_soon")}</Badge>
                ) : !connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={link.isPending}
                    onClick={() => link.mutate(provider)}
                  >
                    {t("settings.method_connect")}
                  </Button>
                ) : linked.length > 1 ? (
                  <RemoveButton
                    variant="outline"
                    size="sm"
                    disabled={unlink.isPending}
                    aria-label={t("settings.method_remove_label", { name })}
                    title={t("settings.method_remove_title", { name })}
                    onConfirm={() => unlink.mutate(id)}
                  >
                    {t("common.remove")}
                  </RemoveButton>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
      {(error || ("error" in search && search.error)) && (
        <p role="alert" className="text-ui text-destructive">
          {error ? errorText(t, error) : t("settings.method_link_error")}
        </p>
      )}
    </div>
  )
}
