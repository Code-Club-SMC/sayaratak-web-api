import { useId, type ReactNode } from "react"

import { FieldLegend, FieldSet } from "@/components/ui/field"
import { FieldError } from "./field-error"

export type ChipOption = { value: string; label: string }

// Chips are native radios or checkboxes under the styling, so arrow keys, space and grouping work without script.
export function ChipSelect({
  type,
  legend,
  options,
  isOn,
  onToggle,
  error,
  action,
}: {
  type: "radio" | "checkbox"
  legend: string
  options: ChipOption[]
  isOn: (value: string) => boolean
  onToggle: (value: string) => void
  error?: string
  // Follows the last chip, such as a "Clear" button.
  action?: ReactNode
}) {
  const name = useId()
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="relative flex min-h-(--control-h) cursor-pointer items-center rounded-full bg-muted px-4 text-ui has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type={type}
              name={name}
              className="peer sr-only"
              checked={isOn(o.value)}
              aria-invalid={Boolean(error)}
              onChange={() => onToggle(o.value)}
            />
            {o.label}
          </label>
        ))}
        {action}
      </div>
      <FieldError message={error} />
    </FieldSet>
  )
}
