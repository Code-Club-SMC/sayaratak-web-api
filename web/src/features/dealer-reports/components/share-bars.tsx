import { useT } from "@/lib/i18n/use-t"

// Two flat bars: share of buyer views and share of the dealer's own stock, both whole percents.
export function ShareBars({
  viewShare,
  stockShare,
}: {
  viewShare: number
  stockShare: number
}) {
  const { t } = useT()
  const rows = [
    { key: "views", label: t("reports.demand_views"), value: viewShare },
    { key: "stock", label: t("reports.demand_stock"), value: stockShare },
  ]
  return (
    <dl className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.key}
          className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3"
        >
          <dt className="text-caption text-muted-foreground">{r.label}</dt>
          <div className="h-2 rounded-full bg-muted" aria-hidden="true">
            <div
              className={`h-2 rounded-full ${r.key === "views" ? "bg-primary" : "bg-chart-3"}`}
              style={{ width: `${Math.min(100, r.value)}%` }}
            />
          </div>
          <dd className="text-end text-ui font-medium num">
            <bdi dir="ltr">{r.value}%</bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}
