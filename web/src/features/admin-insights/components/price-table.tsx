import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { SearchXIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { taxonomyQuery } from "@/features/listings/queries"
import { formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { MarketplaceReport } from "@sayaratak/shared/schemas/reports-insights"

// Typical (middle) price per sale make, model and new/used, with the range most listings sit in (owner, step 11.7-r10: the UI never says "median").
export function PriceTable({
  rows,
  loading,
}: {
  rows?: MarketplaceReport["prices"]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const id = useId()
  const taxonomy = useQuery(taxonomyQuery).data
  const name = (makeId: string, modelId: string) =>
    [
      taxonomy?.makes.find((m) => m.id === makeId)?.name[locale] ?? makeId,
      taxonomy?.models.find((m) => m.id === modelId)?.name[locale] ?? modelId,
    ].join(" ")
  const money = (n: number) => formatPrice(n, locale).amount
  const unit = formatPrice(0, locale).unit
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 panel p-5">
      <h2 id={id} className="text-body font-semibold">
        {t("reports.insights_prices")}
      </h2>
      <p className="text-caption text-muted-foreground">
        {t("reports.insights_prices_note")}
      </p>
      {loading || !rows ? (
        <Skeleton className="h-64" aria-hidden="true" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={t("reports.insights_prices_empty")}
          body={t("reports.insights_prices_empty_body")}
          level={3}
          className="py-6"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.insights_col_model")}</TableHead>
              <TableHead className="text-end">
                {t("reports.insights_col_typical", { unit })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.makeId}|${r.modelId}|${r.condition}`}>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col">
                    <span className="text-ui font-medium">
                      <bdi>{name(r.makeId, r.modelId)}</bdi>
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t(`condition.${r.condition}`)} ·{" "}
                      {t("reports.insights_listings_count", {
                        value: r.count,
                      })}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <span className="flex flex-col">
                    <span className="text-ui font-medium num">
                      {money(r.median)}
                    </span>
                    <span className="text-caption text-muted-foreground num">
                      <bdi dir="ltr">
                        {money(r.low)} – {money(r.high)}
                      </bdi>
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
