import { useId } from "react"

import { useT } from "@/lib/i18n/use-t"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

// Options come from the page: search pages pass the `sort` values of searchParamsSchema, favorites passes its own.
export function SortSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  const { t } = useT()
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-ui text-muted-foreground">
        {t("search.sort_label")}
      </label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o === e.target.value)
          if (next) onChange(next)
        }}
      >
        {options.map((o) => (
          <NativeSelectOption key={o} value={o}>
            {t(`search.sort_${o}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
