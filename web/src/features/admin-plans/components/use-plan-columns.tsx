import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { DataColumn } from "@/lib/table"
import type { AdminPlan } from "@/schemas/admin"
import { PlanActions } from "./plan-actions"
import { PlanCapValue } from "./plan-cap-value"
import { capLabel, capsOf } from "./plan-caps"
import { PlanEnabledSwitch } from "./plan-enabled-switch"
import { PlanNameCell } from "./plan-name-cell"
import { PlanPrice } from "./plan-price"

// Name, price, length, this audience's caps, on or off, order, actions. Rows come in the plans' own order.
export function usePlanColumns(
  audience: AdminPlan["audience"],
  onEdit: (plan: AdminPlan) => void
): DataColumn<AdminPlan>[] {
  const { t, locale } = useT()
  return [
    {
      id: "name",
      header: t("admin.plan_col_name"),
      enableHiding: false,
      cell: ({ row }) => <PlanNameCell plan={row.original} scope="table" />,
    },
    {
      id: "price",
      header: t("admin.plan_col_price"),
      cell: ({ row }) => <PlanPrice price={row.original.price} />,
    },
    {
      id: "duration",
      header: t("admin.plan_col_duration"),
      cell: ({ row }) =>
        t("billing.duration_days", { count: row.original.durationDays }),
    },
    ...capsOf[audience].map((cap): DataColumn<AdminPlan> => ({
      id: cap,
      header: t(capLabel(audience, cap)),
      cell: ({ row }) => <PlanCapValue plan={row.original} cap={cap} />,
    })),
    {
      id: "enabled",
      header: t("admin.plan_col_enabled"),
      cell: ({ row }) => <PlanEnabledSwitch plan={row.original} />,
    },
    {
      id: "order",
      header: t("admin.plan_col_order"),
      cell: ({ row }) => (
        <span className="num">
          {formatNumber(row.original.sortOrder, locale)}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("admin.plan_col_actions"),
      enableHiding: false,
      cell: ({ row }) => (
        <PlanActions
          plan={row.original}
          scope="table"
          onEdit={() => onEdit(row.original)}
        />
      ),
    },
  ]
}
