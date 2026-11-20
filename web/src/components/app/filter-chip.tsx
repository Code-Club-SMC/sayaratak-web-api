import { PlusIcon, XIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { SelectOption } from "./select-input"

// A table filter as a chip: dashed "+ City" while unset, a tinted "City: Kassala" with a clear button once set. It opens the same list as SelectInput and reports "" when cleared.
export function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
}) {
  const { t } = useT()
  const picked = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <Select
        items={options.map((o) => ({ value: o.value, label: o.label }))}
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <SelectTrigger
          size="sm"
          aria-label={label}
          className={cn(
            "h-8! rounded-full bg-transparent ps-2.5 [&>svg:last-child]:hidden",
            picked
              ? "border-transparent bg-primary/10 pe-8 font-medium text-primary"
              : "border-dashed border-border pe-3 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          {picked ? (
            <span className="whitespace-nowrap">
              {label}: {picked.label}
            </span>
          ) : (
            <>
              <PlusIcon aria-hidden="true" className="size-3.5" />
              {label}
            </>
          )}
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="w-auto max-w-(--available-width) min-w-(--anchor-width)"
        >
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {picked && (
        <button
          type="button"
          aria-label={`${t("common.clear")}: ${label}`}
          onClick={() => onChange("")}
          className="absolute end-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-primary motion-color hover:bg-primary/15"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
