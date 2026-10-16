import { useT } from "@/lib/i18n/use-t"
import type { AdminPlan } from "@/schemas/admin"
import { Badge } from "@/components/ui/badge"

// The table and the mobile cards are both on the page, so each names its own badge.
export const planNoteId = (plan: AdminPlan, scope: "table" | "card") =>
  `plan-note-${scope}-${plan.id}`

// The plan's name in the admin's language, the other one under it, and why it is locked: the free plan, or a plan in use.
export function PlanNameCell({
  plan,
  scope,
}: {
  plan: AdminPlan
  scope: "table" | "card"
}) {
  const { t, locale } = useT()
  const other = locale === "ar" ? "en" : "ar"
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-ui font-medium">
          <bdi>{plan.name[locale]}</bdi>
        </span>
        {(plan.free || plan.inUse) && (
          <Badge id={planNoteId(plan, scope)} variant="muted">
            {t(plan.free ? "admin.plan_free_badge" : "admin.plan_in_use_badge")}
          </Badge>
        )}
      </span>
      <span
        lang={other}
        dir={other === "ar" ? "rtl" : "ltr"}
        className="text-caption text-muted-foreground"
      >
        {plan.name[other]}
      </span>
    </div>
  )
}
