import { useT } from "@/lib/i18n/use-t"
import type { Backup } from "@/schemas/admin"
import { Button } from "@/components/ui/button"

// Only a finished backup can be restored.
export function RestoreButton({
  backup,
  date,
  onRestore,
}: {
  backup: Backup
  date: string
  onRestore: () => void
}) {
  const { t } = useT()
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={backup.status !== "ready"}
      aria-label={t("admin.backup_restore_label", { date })}
      onClick={onRestore}
    >
      {t("admin.backup_restore")}
    </Button>
  )
}
