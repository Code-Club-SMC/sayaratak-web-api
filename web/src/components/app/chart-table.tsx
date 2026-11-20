import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { Locale } from "@sayaratak/shared/schemas/locale"
import type { ChartRow, ChartSeries } from "./chart-card"

const cellText = (value: number | string | null | undefined, locale: Locale) =>
  value === null ? "—" : formatNumber(Number(value ?? 0), locale)

// The chart's numbers as a table: one row per bucket, one column per series, and the compare total when there is one.
export function ChartTable({
  data,
  series,
  label,
  compare,
}: {
  data: ChartRow[]
  series: ChartSeries[]
  label: (day: string) => string
  compare?: { label: string; values: (number | null)[] }
}) {
  const { t, locale } = useT()
  return (
    <div className="max-h-80 overflow-y-auto">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("dashboard.col_period")}</TableHead>
            {series.map((s) => (
              <TableHead key={s.key} className="text-end">
                {s.label}
              </TableHead>
            ))}
            {compare && (
              <TableHead className="text-end">{compare.label}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={row.day}>
              <TableCell>{label(row.day)}</TableCell>
              {series.map((s) => (
                <TableCell key={s.key} className="text-end num">
                  {cellText(row[s.key], locale)}
                </TableCell>
              ))}
              {compare && (
                <TableCell className="text-end text-muted-foreground num">
                  {cellText(compare.values[i], locale)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
