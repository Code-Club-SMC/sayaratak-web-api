import type { ReactNode } from "react"

import { ChipSelect, type ChipOption } from "./chip-select"

export function ChipSingleSelect({
  legend,
  options,
  value,
  onChange,
  error,
  action,
}: {
  legend: string
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  error?: string
  action?: ReactNode
}) {
  return (
    <ChipSelect
      type="radio"
      legend={legend}
      options={options}
      isOn={(v) => v === value}
      onToggle={onChange}
      error={error}
      action={action}
    />
  )
}
