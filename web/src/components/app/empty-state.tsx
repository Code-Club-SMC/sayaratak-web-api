import type { ReactNode } from "react"

// A5: a written sentence and one action, no illustration. `action` is a Button or a link styled as one.
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <h2 className="text-title font-semibold">{title}</h2>
      {body && <p className="text-body text-muted-foreground">{body}</p>}
      {action}
    </div>
  )
}
