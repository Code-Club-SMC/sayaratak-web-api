import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ControlProps } from "./form-field"

export type SelectOption = { value: string; label: string }

// The shadcn Select on a plain string value, the one dropdown of the app (never a native select element).
// `placeholder` adds the empty option ("Choose a city"); picking it reports "".
export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  ...aria
}: Partial<ControlProps> & {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}) {
  const items: { value: string | null; label: string }[] = [
    ...(placeholder ? [{ value: null, label: placeholder }] : []),
    ...options,
  ]
  return (
    <Select
      items={items}
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger {...aria} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {items.map((o) => (
          <SelectItem
            key={o.value ?? ""}
            value={o.value}
            className="min-h-10 md:min-h-8"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
