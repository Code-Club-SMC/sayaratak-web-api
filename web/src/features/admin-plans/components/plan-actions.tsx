import { useT } from "@/lib/i18n/use-t"
import type { AdminPlan } from "@/schemas/admin"
import { Button } from "@/components/ui/button"
import { planNoteId } from "./plan-name-cell"
import { PlanRemoveButton } from "./plan-remove-button"

export function PlanActions({
  plan,
  scope,
  onEdit,
}: {
  plan: AdminPlan
  scope: "table" | "card"
  onEdit: () => void
}) {
  const { t, locale } = useT()
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t("admin.plan_edit_label", { name: plan.name[locale] })}
        onClick={onEdit}
      >
        {t("common.edit")}
      </Button>
      <PlanRemoveButton
        plan={plan}
        describedBy={
          plan.free || plan.inUse ? planNoteId(plan, scope) : undefined
        }
      />
    </div>
  )
}
