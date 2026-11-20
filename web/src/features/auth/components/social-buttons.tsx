import { useSyncExternalStore } from "react"

import { BrandIcon } from "@/components/app/brand-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useT } from "@/lib/i18n/use-t"

export type Provider = "google" | "apple" | "facebook"

export const allProviders: Provider[] = ["google", "apple", "facebook"]

// Apple and Facebook stay off until their keys exist on the API (VITE_FEATURE_APPLE / VITE_FEATURE_FACEBOOK="true"): hidden on sign-in, "Coming soon" in settings. Read per call so tests can stub the env.
export const isLive = (provider: Provider) =>
  ({
    google: "true",
    apple: import.meta.env.VITE_FEATURE_APPLE,
    facebook: import.meta.env.VITE_FEATURE_FACEBOOK,
  })[provider] === "true"

const noSubscribe = () => () => {}

// The "Last used" cookie, read only in the browser so server and first client render match.
export function useLastUsedMethod() {
  return useSyncExternalStore(
    noSubscribe,
    () => authClient.getLastUsedLoginMethod(),
    () => null
  )
}

// One row of three, logo and short name, so the form does not grow a scroll (owner, 2026-11-20). Apple and Facebook show disabled with "Soon" until live; the full "Continue with ..." name stays as the accessible label.
export function SocialButtons({
  disabled,
  onSelect,
}: {
  disabled?: boolean
  onSelect: (provider: Provider) => void
}) {
  const { t } = useT()
  const last = useLastUsedMethod()
  return (
    // Below 20rem (phones under about 375px) the names drop and the logos stay; the aria-label carries the name.
    <div className="@container grid grid-cols-3 gap-2">
      {allProviders.map((provider) => {
        const live = isLive(provider)
        const label = t(`auth.continue_${provider}`)
        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            size="lg"
            className="relative min-w-0 gap-1 px-1"
            disabled={disabled || !live}
            aria-label={
              !live
                ? t("auth.provider_soon", { name: label })
                : last === provider
                  ? t("auth.provider_last_used", { label })
                  : label
            }
            onClick={() => onSelect(provider)}
          >
            <BrandIcon name={provider} />
            <span className="hidden truncate @[20rem]:inline">
              {t(`auth.provider_${provider}`)}
            </span>
            {(!live || last === provider) && (
              // Sits on the top border; the background plate hides the line behind the tinted badge.
              <span
                aria-hidden="true"
                className="absolute end-1 -top-2.5 rounded-full bg-background"
              >
                <Badge variant={live ? "primary" : "muted"}>
                  {live ? t("auth.last_used") : t("auth.coming_soon")}
                </Badge>
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
