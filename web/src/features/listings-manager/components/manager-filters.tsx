import { FilterChip } from "@/components/app/filter-chip"
import { useT } from "@/lib/i18n/use-t"
import {
  intentSchema,
  vehicleTypeSchema,
} from "@sayaratak/shared/schemas/listing"
import {
  listingsManagerSearchSchema,
  type ListingsManagerSearch,
} from "../schemas"

const types = [...vehicleTypeSchema.options, "part"] as const

// The vehicle type and sale or rent selects in the table toolbar. Clearing one drops it from the URL.
export function ManagerFilters({
  search,
  onChange,
}: {
  search: ListingsManagerSearch
  onChange: (next: Partial<ListingsManagerSearch>) => void
}) {
  const { t } = useT()
  const { type, intent } = listingsManagerSearchSchema.shape
  return (
    <>
      <FilterChip
        label={t("manager.type_filter")}
        value={search.type ?? ""}
        options={types.map((v) => ({ value: v, label: t(`post.type_${v}`) }))}
        onChange={(next) => onChange({ type: type.parse(next || undefined) })}
      />
      <FilterChip
        label={t("manager.intent_filter")}
        value={search.intent ?? ""}
        options={intentSchema.options.map((v) => ({
          value: v,
          label: t(`listing.${v}`),
        }))}
        onChange={(next) =>
          onChange({ intent: intent.parse(next || undefined) })
        }
      />
    </>
  )
}
