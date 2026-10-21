import { useEffect, useId, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"

import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import {
  useDeleteTaxonomyRow,
  useReorderTaxonomy,
  useUpdateTaxonomyRow,
} from "@/features/admin/queries"
import { taxonomyQuery } from "@/features/listings/queries"
import { SectionError } from "@/components/app/section-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import {
  CategoryDialog,
  type CategoryDraft,
  type CategoryKind,
} from "./category-dialog"
import { CategoryRow } from "./category-row"

// One list of the page. Vehicle types are fixed in code, so they can be renamed, switched and moved but not added or removed; part categories can also be added and removed (a category in use refuses).
export function CategorySection({ kind }: { kind: CategoryKind }) {
  const { t } = useT()
  const id = useId()
  const taxonomy = useQuery(taxonomyQuery)
  const reorder = useReorderTaxonomy(kind)
  const update = useUpdateTaxonomyRow(kind)
  const remove = useDeleteTaxonomyRow(kind)
  const [draft, setDraft] = useState<CategoryDraft>()
  const vehicle = kind === "vehicle-types"
  const key = vehicle ? "vehicle_types" : "part_categories"
  const rows = vehicle
    ? taxonomy.data?.vehicleTypes
    : taxonomy.data?.partCategories
  const fail = (error: unknown) => toast.add({ title: errorText(t, error) })

  // A moved row is re-inserted in the DOM, which drops focus; put it back on the same arrow, or on the other one when the row reached an end.
  const moved = useRef<{ id: string; step: number }>(undefined)
  useEffect(() => {
    const m = moved.current
    if (!m) return
    moved.current = undefined
    const button = (step: number) =>
      document.querySelector<HTMLButtonElement>(`[data-move="${m.id}:${step}"]`)
    const same = button(m.step)
    ;(same && !same.disabled ? same : button(-m.step))?.focus()
  }, [rows])

  if (taxonomy.isError && !rows)
    return (
      <SectionError
        title={t(`admin.categories_${key}_title`)}
        message={t("admin.categories_error")}
        onRetry={() => void taxonomy.refetch()}
      />
    )
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="text-title font-semibold">
            {t(`admin.categories_${key}_title`)}
          </h2>
          <p className="text-ui text-muted-foreground">
            {t(`admin.categories_${key}_body`)}
          </p>
        </div>
        {!vehicle && (
          <Button type="button" onClick={() => setDraft({})}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {t("admin.categories_add_part_categories")}
          </Button>
        )}
      </div>
      {!rows ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: vehicle ? 5 : 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul
          aria-labelledby={id}
          className="flex flex-col divide-y divide-border"
        >
          {rows.map((row, i) => (
            <CategoryRow
              key={row.id}
              id={row.id}
              name={row.name}
              first={i === 0}
              last={i === rows.length - 1}
              onMove={(step) => {
                const ids = rows.map((r) => r.id)
                ids.splice(i, 1)
                ids.splice(i + step, 0, row.id)
                moved.current = { id: row.id, step }
                reorder.mutate(ids, { onError: fail })
              }}
              onEdit={() => setDraft({ id: row.id, name: row.name })}
              {...("enabled" in row
                ? {
                    enabled: row.enabled,
                    onToggle: (next: boolean) =>
                      update
                        .mutateAsync({ id: row.id, enabled: next })
                        .catch((e: unknown) => {
                          fail(e)
                          throw e
                        }),
                  }
                : {
                    onRemove: () =>
                      remove.mutate(row.id, {
                        onSuccess: () =>
                          toast.add({ title: t("admin.categories_removed") }),
                        onError: fail,
                      }),
                  })}
            />
          ))}
        </ul>
      )}
      <CategoryDialog
        kind={kind}
        draft={draft}
        onClose={() => setDraft(undefined)}
      />
    </section>
  )
}
