import { useId } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { ListingsReport } from "@sayaratak/shared/schemas/reports"

// How long the live listings have been up, in five age bands, each with a flat bar sized against the largest band.
export function StockAgeCard({
  buckets,
  loading,
}: {
  buckets?: ListingsReport["summary"]["stockAge"]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const id = useId()
  const max = Math.max(1, ...(buckets ?? []).map((b) => b.count))
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {t("reports.stock_age_title")}
      </h2>
      {loading || !buckets ? (
        <Skeleton className="h-40" aria-hidden="true" />
      ) : (
        <dl className="flex flex-col gap-3">
          {buckets.map((b) => (
            <div
              key={b.key}
              className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3"
            >
              <dt className="text-ui text-muted-foreground">
                {t(`reports.age_${b.key}`)}
              </dt>
              <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <dd className="text-end text-ui font-medium num">
                {formatNumber(b.count, locale)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
