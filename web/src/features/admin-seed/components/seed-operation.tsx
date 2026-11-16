import type { SeedOperation } from "@sayaratak/shared/schemas/admin-seed"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { stagePercent } from "../progress"
import { useRetrySeed } from "../queries"

export function SeedOperationView({
  operation,
  manifestDigest,
}: {
  operation: SeedOperation
  manifestDigest: string
}) {
  const { t } = useT()
  const retry = useRetrySeed()
  const percent = stagePercent({
    completed: operation.progress.completed,
    total: operation.progress.total,
    complete: operation.state === "completed",
  })
  const stageKey =
    `admin.seed_stage_${operation.progress.stage.replace(/-/g, "_")}` as const
  const stateKey = `admin.seed_state_${operation.state}` as const

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between text-ui">
        <span className="font-medium text-foreground">
          {t(stageKey)} ({t(stateKey)})
        </span>
        <span className="text-caption font-semibold text-muted-foreground">
          {percent !== null ? `${percent}%` : "—"}
        </span>
      </div>

      <Progress value={percent ?? 0} />

      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>
          {t("admin.seed_progress_units", {
            completed: operation.progress.completed,
            total: operation.progress.total,
          })}
        </span>
        {operation.committedListings > 0 && (
          <span>
            {t("admin.seed_summary_listings", {
              count: operation.committedListings,
            })}
          </span>
        )}
      </div>

      {operation.state === "failed" && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-caption text-destructive">
            {operation.error
              ? t(`admin.seed_error_${operation.error}` as const)
              : t("admin.seed_error_generic")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retry.isPending}
            onClick={() =>
              retry.mutate({
                operationId: operation.id,
                manifestDigest,
              })
            }
          >
            {t("admin.seed_action_retry")}
          </Button>
        </div>
      )}
    </div>
  )
}
