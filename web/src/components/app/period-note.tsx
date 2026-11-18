import { InfoIcon } from "lucide-react"

import { formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { Period } from "@sayaratak/shared/schemas/period"

const onHour = (minute: string) => minute.endsWith(":00")
const onDay = (minute: string) => minute.endsWith("T00:00")

// Says where view, call and WhatsApp counts are less exact than the period: per whole hour, per whole day past the 90 days kept per hour, per month past 13 months, not compared, or hourly counts that start later than the period (step 11.7-r2).
export function PeriodNote({
  period,
  hourlySince,
}: {
  period?: Period
  hourlySince?: string
}) {
  const { t, locale } = useT()
  if (!period) return null
  const hourly = period.granularity === "hour"
  const partDays = !onDay(period.from) || !onDay(period.to)
  const notes = [
    period.custom &&
      (!onHour(period.from) || !onHour(period.to)) &&
      t("dashboard.note_whole_hours"),
    period.wholeDays && t("dashboard.note_whole_days"),
    period.rolledUp && t("dashboard.note_rolled"),
    !period.eventsCompared &&
      t(
        hourly
          ? "dashboard.note_not_compared_hours"
          : "dashboard.note_not_compared"
      ),
    hourlySince &&
      (hourly || partDays) &&
      period.from.slice(0, 10) < hourlySince &&
      t("dashboard.note_hourly_since", {
        date: formatShortDate(hourlySince, locale),
      }),
  ].filter(Boolean)
  if (!notes.length) return null
  return (
    <ul className="flex flex-col gap-1 text-caption text-muted-foreground">
      {notes.map((note) => (
        <li key={String(note)} className="flex items-start gap-2">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {note}
        </li>
      ))}
    </ul>
  )
}
