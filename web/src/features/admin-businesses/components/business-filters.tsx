import { useQuery } from "@tanstack/react-query"

import { FilterChip } from "@/components/app/filter-chip"
import { useT } from "@/lib/i18n/use-t"
import type { AdminBusiness } from "@sayaratak/shared/schemas/admin"
import { taxonomyQuery } from "@/features/listings/queries"
import { adminQueries } from "@/features/admin/queries"
import {
  businessesSearchSchema,
  type BusinessesSearch,
} from "@/features/admin/schemas"

// City, verified, status and plan (only this type's plans) in the table toolbar. Clearing one drops it from the URL.
export function BusinessFilters({
  type,
  search,
  onChange,
}: {
  type: AdminBusiness["type"]
  search: BusinessesSearch
  onChange: (next: Partial<BusinessesSearch>) => void
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const { data: plans } = useQuery(adminQueries.plans)
  const { verified, status } = businessesSearchSchema.shape
  return (
    <>
      <FilterChip
        label={t("admin.city_filter")}
        value={search.cityId ?? ""}
        options={(tax?.cities ?? []).map((c) => ({
          value: c.id,
          label: c.name[locale],
        }))}
        onChange={(next) => onChange({ cityId: next || undefined })}
      />
      <FilterChip
        label={t("admin.business_col_verified")}
        value={search.verified ?? ""}
        options={(["yes", "no"] as const).map((v) => ({
          value: v,
          label: t(`admin.business_verified_${v}`),
        }))}
        onChange={(next) =>
          onChange({ verified: verified.parse(next || undefined) })
        }
      />
      <FilterChip
        label={t("admin.report_col_status")}
        value={search.status ?? ""}
        options={(["active", "suspended"] as const).map((v) => ({
          value: v,
          label: t(`admin.business_status_${v}`),
        }))}
        onChange={(next) =>
          onChange({ status: status.parse(next || undefined) })
        }
      />
      <FilterChip
        label={t("admin.business_col_plan")}
        value={search.planId ?? ""}
        options={(plans ?? [])
          .filter((p) => p.audience === type)
          .map((p) => ({ value: p.id, label: p.name[locale] }))}
        onChange={(next) => onChange({ planId: next || undefined })}
      />
    </>
  )
}
