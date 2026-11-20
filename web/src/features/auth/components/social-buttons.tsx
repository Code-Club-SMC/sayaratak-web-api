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
    <div className="flex flex-col gap-3">
      {allProviders.filter(isLive).map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={() => onSelect(provider)}
        >
          <BrandIcon name={provider} />
          {t(`auth.continue_${provider}`)}
          {last === provider && (
            <Badge variant="primary">{t("auth.last_used")}</Badge>
          )}
        </Button>
      ))}
    </div>
  )
}
