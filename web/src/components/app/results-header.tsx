import type { ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"

// Title and result count on one side, controls (filter trigger, sort, save) on the other.
export function ResultsHeader({
  title,
  total,
  children,
}: {
  title: string
  total: number
  children?: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-page font-semibold">{title}</h1>
        <p aria-live="polite" className="text-ui text-muted-foreground num">
          {t("search.results_count", { count: total })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
