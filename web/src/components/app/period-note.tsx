import { InfoIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import type { Period } from "@sayaratak/shared/schemas/period"

// Says where view, call and WhatsApp counts are less exact than the period: per whole day (until hourly counts, step 11.7-r2), per month past 13 months, or not compared.
export function PeriodNote({ period }: { period?: Period }) {
  const { t } = useT()
  if (!period) return null
  const notes = [
    period.custom &&
      (!period.from.endsWith("T00:00") || !period.to.endsWith("T00:00")) &&
      t("dashboard.note_whole_days"),
    period.rolledUp && t("dashboard.note_rolled"),
    !period.eventsCompared && t("dashboard.note_not_compared"),
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
