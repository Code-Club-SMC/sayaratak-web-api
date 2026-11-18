import { useId, type ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"

export type BarListRow = { key: string; label: ReactNode; value: number }

// A titled list of labelled counts, each with a flat bar sized against the largest one (stock age, reply speed, star breakdown).
export function BarListCard({
  title,
  rows,
  loading,
  children,
}: {
  title: string
  rows?: BarListRow[]
  loading?: boolean
  // Shown under the list, such as a short explanation.
  children?: ReactNode
}) {
  const { locale } = useT()
  const id = useId()
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value))
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {title}
      </h2>
      {loading || !rows ? (
        <Skeleton className="h-40" aria-hidden="true" />
      ) : (
        <dl className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3"
            >
              <dt className="text-ui text-muted-foreground">{r.label}</dt>
              <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
              <dd className="text-end text-ui font-medium num">
                {formatNumber(r.value, locale)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  )
}
