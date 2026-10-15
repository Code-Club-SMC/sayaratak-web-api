import { useQuery } from "@tanstack/react-query"

import { SelectInput } from "@/components/app/select-input"
import { useT } from "@/lib/i18n/use-t"
import { taxonomyQuery } from "@/features/listings/queries"
import {
  adminListingTypes,
  adminListingsSearchSchema,
  sellerKinds,
  type AdminListingsSearch,
} from "@/features/admin/schemas"

// City, type, seller kind and promotion in the table toolbar. Clearing one drops it from the URL.
export function AdminListingFilters({
  search,
  onChange,
}: {
  search: AdminListingsSearch
  onChange: (next: Partial<AdminListingsSearch>) => void
}) {
  const { t, locale } = useT()
  const { data: tax } = useQuery(taxonomyQuery)
  const { type, sellerKind, promoted } = adminListingsSearchSchema.shape
  return (
    <>
      <SelectInput
        className="w-40"
        aria-label={t("admin.city_filter")}
        placeholder={t("admin.city_filter")}
        value={search.cityId ?? ""}
        options={(tax?.cities ?? []).map((c) => ({
          value: c.id,
          label: c.name[locale],
        }))}
        onChange={(next) => onChange({ cityId: next || undefined })}
      />
      <SelectInput
        className="w-40"
        aria-label={t("admin.type_filter")}
        placeholder={t("admin.type_filter")}
        value={search.type ?? ""}
        options={adminListingTypes.map((v) => ({
          value: v,
          label: t(v === "vehicle" ? "admin.type_vehicle" : `post.type_${v}`),
        }))}
        onChange={(next) => onChange({ type: type.parse(next || undefined) })}
      />
      <SelectInput
        className="w-40"
        aria-label={t("admin.seller_kind")}
        value={search.sellerKind}
        options={sellerKinds.map((v) => ({
          value: v,
          label: t(`admin.seller_${v}`),
        }))}
        onChange={(next) => onChange({ sellerKind: sellerKind.parse(next) })}
      />
      <SelectInput
        className="w-40"
        aria-label={t("admin.promoted_filter")}
        placeholder={t("admin.promoted_filter")}
        value={search.promoted ?? ""}
        options={(["yes", "no"] as const).map((v) => ({
          value: v,
          label: t(`admin.promoted_${v}`),
        }))}
        onChange={(next) =>
          onChange({ promoted: promoted.parse(next || undefined) })
        }
      />
    </>
  )
}
