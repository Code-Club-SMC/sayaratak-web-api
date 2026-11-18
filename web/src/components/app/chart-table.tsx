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
import type { ChartRow, ChartSeries } from "./chart-card"

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
  compare?: { label: string; values: number[] }
}) {
  const { t, locale } = useT()
  return (
    <div className="max-h-80 overflow-y-auto">
      <Table>
        <TableHeader>
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
                  {formatNumber(Number(row[s.key] ?? 0), locale)}
                </TableCell>
              ))}
              {compare && (
                <TableCell className="text-end text-muted-foreground num">
                  {formatNumber(compare.values[i] ?? 0, locale)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
