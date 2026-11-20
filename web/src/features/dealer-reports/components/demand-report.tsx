import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDownIcon, SearchXIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { taxonomyQuery } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { DemandMake } from "@sayaratak/shared/schemas/reports-demand"
import { demandReportQuery } from "../queries"
import { ShareBars } from "./share-bars"

// What buyers look at against what the dealer stocks: share of market views per make (open a make for its models) next to the share of the dealer's live listings (step 11.7-r6).
export function DemandReport({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const id = useId()
  const report = useQuery(demandReportQuery(query))
  const taxonomy = useQuery(taxonomyQuery).data
  const [open, setOpen] = useState<string | null>(null)
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const makeName = (makeId: string | null) =>
    (makeId && taxonomy?.makes.find((m) => m.id === makeId)?.name[locale]) ??
    t("reports.demand_other_makes")
  const modelName = (modelId: string | null) =>
    (modelId && taxonomy?.models.find((m) => m.id === modelId)?.name[locale]) ??
    t("reports.demand_other_models")
  const city =
    data?.cityId &&
    taxonomy?.cities.find((c) => c.id === data.cityId)?.name[locale]
  const row = (m: DemandMake) => {
    const key = m.makeId ?? "other"
    const expanded = open === key
    const panel = `${id}-${key}`
    return (
      <li key={key} className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ui font-medium">
            <bdi>{makeName(m.makeId)}</bdi>
          </span>
          {m.models.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              aria-controls={panel}
              onClick={() => setOpen(expanded ? null : key)}
            >
              {t("reports.demand_models")}
              <ChevronDownIcon
                aria-hidden="true"
                className={expanded ? "rotate-180" : undefined}
              />
            </Button>
          )}
        </div>
        <ShareBars viewShare={m.viewShare} stockShare={m.stockShare} />
        {expanded && (
          <ul id={panel} className="flex flex-col gap-3 border-s-2 ps-4">
            {m.models.map((md) => (
              <li key={md.modelId ?? "other"} className="flex flex-col gap-1.5">
                <span className="text-caption font-medium">
                  <bdi>{modelName(md.modelId)}</bdi>
                </span>
                <ShareBars
                  viewShare={md.viewShare}
                  stockShare={md.stockShare}
                />
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <section aria-labelledby={id} className="flex flex-col gap-2 panel p-5">
        <h2 id={id} className="text-body font-semibold">
          {t("reports.demand_title")}
        </h2>
        <p className="text-caption text-muted-foreground">
          {data?.scope === "city" && city
            ? t("reports.demand_scope_city", { city })
            : t("reports.demand_scope_country")}
        </p>
        {isPending || !data ? (
          <Skeleton className="h-64" aria-hidden="true" />
        ) : data.makes.length === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title={t("reports.demand_empty")}
            level={3}
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.makes.map(row)}
          </ul>
        )}
      </section>
    </div>
  )
}
