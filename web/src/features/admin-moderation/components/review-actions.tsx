import { RemoveButton } from "@/components/app/remove-button"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useT } from "@/lib/i18n/use-t"

// Sticky at the bottom of the review pane. One primary action; the key hint shows on wide screens while shortcuts are on.
export function ReviewActions({
  hints,
  onApprove,
  onReject,
  onRemove,
}: {
  hints: boolean
  onApprove: () => void
  onReject: () => void
  onRemove: () => void
}) {
  const { t } = useT()
  const hint = (key: string) =>
    hints && (
      <Kbd aria-hidden="true" className="hidden lg:inline-flex">
        {key}
      </Kbd>
    )
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-3 bg-background px-1 py-3">
      <Button
        type="button"
        onClick={onApprove}
        aria-keyshortcuts={hints ? "A" : undefined}
      >
        {t("admin.approve")}
        {hint("A")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onReject}
        aria-keyshortcuts={hints ? "R" : undefined}
      >
        {t("admin.reject")}
        {hint("R")}
      </Button>
      <RemoveButton
        variant="ghost"
        className="ms-auto text-destructive"
        title={t("admin.remove_title")}
        onConfirm={onRemove}
      >
        {t("common.remove")}
      </RemoveButton>
    </div>
  )
}
