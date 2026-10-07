import { FieldLegend, FieldSet } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FieldError } from "./field-error"
import type { ChipOption } from "./chip-select"

// For contact methods and notification switches: plain checkboxes under one legend with an error slot.
export function CheckboxGroup({
  legend,
  options,
  value,
  onChange,
  error,
  disabled = [],
}: {
  legend: string
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  // Values that stay visible but cannot be changed.
  disabled?: string[]
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      {options.map((o) => (
        <Label key={o.value} className="min-h-11 font-normal">
          <Checkbox
            checked={value.includes(o.value)}
            disabled={disabled.includes(o.value)}
            aria-invalid={Boolean(error)}
            onCheckedChange={(on) =>
              onChange(
                on ? [...value, o.value] : value.filter((x) => x !== o.value)
              )
            }
          />
          {o.label}
        </Label>
      ))}
      <FieldError message={error} />
    </FieldSet>
  )
}
