import { ChipSelect, type ChipOption } from "./chip-select"

export function ChipSingleSelect({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <ChipSelect
      type="radio"
      legend={legend}
      options={options}
      isOn={(v) => v === value}
      onToggle={onChange}
      error={error}
    />
  )
}
