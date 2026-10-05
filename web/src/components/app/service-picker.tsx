import { PlusIcon, XIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChipMultiSelect } from "./chip-multi-select"
import { FormField } from "./form-field"
import { NumberField } from "./number-field"

export type ServiceRow = { name: string; priceFrom: number | null }
type RowError = { name?: string; priceFrom?: string } | undefined

// Template chips add or remove a row of the same name, so no template id is stored. A row whose name was edited becomes a custom service. Takes a value and `onChange` like the other blocks, so it works with RHF `Controller`.
export function ServicePicker({
  value,
  onChange,
  templates,
  errors = [],
  error,
  max = 10,
}: {
  value: ServiceRow[]
  onChange: (value: ServiceRow[]) => void
  templates: string[]
  errors?: RowError[]
  error?: string
  max?: number
}) {
  const { t } = useT()
  const patch = (i: number, p: Partial<ServiceRow>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)))
  return (
    <div className="flex flex-col gap-4">
      <ChipMultiSelect
        legend={t("form.services")}
        options={templates.map((name) => ({ value: name, label: name }))}
        value={value.map((r) => r.name)}
        onChange={(names) =>
          onChange([
            ...value.filter((r) => names.includes(r.name)),
            ...names
              .filter((n) => !value.some((r) => r.name === n))
              .map((name) => ({ name, priceFrom: null })),
          ])
        }
        max={max}
        error={error}
      />
      {value.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <FormField
            label={t("form.service_name", { number: i + 1 })}
            error={errors[i]?.name}
            className="flex-1"
          >
            {(c) => (
              <Input
                {...c}
                value={row.name}
                onChange={(e) => patch(i, { name: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            label={t("form.service_price")}
            error={errors[i]?.priceFrom}
            optional
            className="w-40"
          >
            {(c) => (
              <NumberField
                {...c}
                grouping
                value={row.priceFrom}
                onChange={(priceFrom) => patch(i, { priceFrom })}
              />
            )}
          </FormField>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-6"
            aria-label={t("form.remove_service", { number: i + 1 })}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      {value.length < max && (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => onChange([...value, { name: "", priceFrom: null }])}
        >
          <PlusIcon data-icon="inline-start" />
          {t("form.add_service")}
        </Button>
      )}
    </div>
  )
}
