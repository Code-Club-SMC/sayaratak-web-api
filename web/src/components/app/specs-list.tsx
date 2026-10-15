import type { ReactNode } from "react"

export type Spec = { label: string; value: ReactNode }

// A definition list on two columns from sm. Values that can hold Latin text next to Arabic (makes, models) are wrapped in <bdi> by the caller.
export function SpecsList({ items }: { items: Spec[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 sm:justify-start"
        >
          <dt className="w-32 shrink-0 text-ui text-muted-foreground">
            {label}
          </dt>
          <dd className="min-w-0 text-ui font-medium wrap-anywhere">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
