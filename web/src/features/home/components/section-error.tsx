import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"

export function SectionError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT()
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-ui">
      <p>{t("home.section_error")}</p>
      <Button variant="ghost" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  )
}
