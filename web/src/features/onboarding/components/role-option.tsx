import type { LucideIcon } from "lucide-react"

import { RadioGroupItem } from "@/components/ui/radio-group"

export function RoleOption({
  value,
  icon: Icon,
  title,
  description,
}: {
  value: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center gap-4 rounded-xl bg-card p-4 has-focus-visible:ring-2 has-focus-visible:ring-ring has-data-checked:bg-accent">
      <Icon aria-hidden="true" className="size-6 shrink-0 text-primary" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-medium">{title}</span>
        <span className="text-ui text-muted-foreground">{description}</span>
      </span>
      <RadioGroupItem value={value} />
    </label>
  )
}
