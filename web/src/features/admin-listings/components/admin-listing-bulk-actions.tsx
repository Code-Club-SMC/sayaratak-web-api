import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import { useBulkListings } from "@/features/admin/queries"
import type { AdminListingsSearch } from "@/features/admin/schemas"
import { RemoveButton } from "@/components/app/remove-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type Action = "approve" | "remove" | "restore"

// The bulk bar's buttons, per tab: Approve where something waits or was rejected, Remove unless all are removed, Restore where removed ones show. The mock skips rows the action does not fit and says how many it changed.
export function AdminListingBulkActions({
  tab,
  ids,
  clear,
}: {
  tab: AdminListingsSearch["tab"]
  ids: string[]
  clear: () => void
}) {
  const { t } = useT()
  const bulk = useBulkListings()
  const run = (action: Action) =>
    bulk.mutate(
      { ids, action },
      {
        onSuccess: ({ count }) => {
          clear()
          toast.add({ title: t(`admin.listings_${action}d`, { count }) })
        },
        onError: (e) => toast.add({ title: errorText(t, e) }),
      }
    )
  return (
    <>
      {["all", "pending", "rejected"].includes(tab) && (
        <Button
          type="button"
          disabled={bulk.isPending}
          onClick={() => run("approve")}
        >
          {t("admin.approve")}
        </Button>
      )}
      {["all", "removed"].includes(tab) && (
        <Button
          type="button"
          variant="outline"
          disabled={bulk.isPending}
          onClick={() => run("restore")}
        >
          {t("admin.restore")}
        </Button>
      )}
      {tab !== "removed" && (
        <RemoveButton
          variant="outline"
          className="text-destructive"
          disabled={bulk.isPending}
          title={t("admin.bulk_remove_title", { count: ids.length })}
          onConfirm={() => run("remove")}
        >
          {t("common.remove")}
        </RemoveButton>
      )}
    </>
  )
}
