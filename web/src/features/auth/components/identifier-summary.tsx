import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"

// The identifier typed in step 1, shown LTR, with a way back to change it.
export function IdentifierSummary({
  value,
  onChange,
}: {
  value: string
  onChange: () => void
}) {
  const { t } = useT()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-1">
      <bdi dir="ltr" className="truncate text-ui">
        {value}
      </bdi>
      <Button type="button" variant="link" onClick={onChange}>
        {t("auth.change_identifier")}
      </Button>
    </div>
  )
}
