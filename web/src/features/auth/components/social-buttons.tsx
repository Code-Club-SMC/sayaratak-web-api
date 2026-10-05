import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"

export type Provider = "google" | "facebook"

export function SocialButtons({
  disabled,
  onSelect,
}: {
  disabled?: boolean
  onSelect: (provider: Provider) => void
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onSelect("google")}
      >
        {t("auth.continue_google")}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onSelect("facebook")}
      >
        {t("auth.continue_facebook")}
      </Button>
    </div>
  )
}
