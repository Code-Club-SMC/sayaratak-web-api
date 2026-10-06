import type { ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"

export const resultsHeadingId = "results-heading"

// Title and result count on one side, controls (filter trigger, sort, save) on the other.
export function ResultsHeader({
  title,
  total,
  children,
}: {
  title: string
  total?: number
  children?: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1
          id={resultsHeadingId}
          tabIndex={-1}
          className="text-page font-semibold outline-none"
        >
          {title}
        </h1>
        <p aria-live="polite" className="text-ui text-muted-foreground num">
          {total === undefined
            ? ""
            : t("search.results_count", { count: total })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
