import { useId, useState } from "react"
import type { DateRange } from "react-day-picker"
import { ar, enUS } from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"

import { instantOf } from "@sayaratak/shared/lib/period"
import { formatMinute } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// A calendar day as "2026-11-01" from the picker's local-midnight Date.
const dayOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const dateOf = (day: string) => new Date(`${day}T00:00`)
// `to` is exclusive. A range ending at midnight shows its last day ending 23:59, and an end time of 23:59 sends the next midnight, so whole days stay whole; any other end time is sent as it is.
const shiftMinute = (minute: string, by: number) =>
  new Date(Date.parse(`${minute}:00Z`) + by * 60_000).toISOString().slice(0, 16)
const shownEnd = (to: string) =>
  to.endsWith("T00:00") ? shiftMinute(to, -1) : to
const sentEnd = (end: string) =>
  end.endsWith("T23:59") ? shiftMinute(end, 1) : end

// First and last day on a calendar, a start and end time (Khartoum), Apply. `value` is the current custom range, if any.
export function CustomRangePopover({
  value,
  open,
  onOpenChange,
  onApply,
}: {
  value?: { from: string; to: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (range: { from: string; to: string }) => void
}) {
  const { t, locale } = useT()
  const id = useId()
  const last = value ? shownEnd(value.to) : undefined
  const [days, setDays] = useState<DateRange | undefined>(
    value && last
      ? { from: dateOf(value.from.slice(0, 10)), to: dateOf(last.slice(0, 10)) }
      : undefined
  )
  const [start, setStart] = useState(value?.from.slice(11) ?? "00:00")
  const [end, setEnd] = useState(last?.slice(11) ?? "23:59")
  const first = days?.from ? dayOf(days.from) : undefined
  const final = days?.to ? dayOf(days.to) : first
  const from = first && `${first}T${start}`
  const to = final && sentEnd(`${final}T${end}`)
  const ordered = !!from && !!to && instantOf(from) < instantOf(to)
  const error = !first
    ? t("dashboard.custom_pick")
    : !ordered
      ? t("dashboard.custom_order")
      : undefined
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="max-w-full" />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {value && last ? (
          <bdi className="truncate num">
            {formatMinute(value.from, locale)} – {formatMinute(last, locale)}
          </bdi>
        ) : (
          t("form.pick_date")
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-auto flex-col gap-3 p-3">
        <Calendar
          mode="range"
          selected={days}
          onSelect={setDays}
          defaultMonth={days?.from}
          disabled={{ after: new Date() }}
          weekStartsOn={6}
          numerals="latn"
          dir={locale === "ar" ? "rtl" : "ltr"}
          locale={locale === "ar" ? ar : enUS}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-start`}>{t("dashboard.custom_start")}</Label>
            <Input
              id={`${id}-start`}
              type="time"
              dir="ltr"
              value={start}
              onChange={(e) => setStart(e.target.value || "00:00")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-end`}>{t("dashboard.custom_end")}</Label>
            <Input
              id={`${id}-end`}
              type="time"
              dir="ltr"
              value={end}
              onChange={(e) => setEnd(e.target.value || "23:59")}
            />
          </div>
        </div>
        {error && (
          <p id={`${id}-error`} className="text-caption text-muted-foreground">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onClick={() => {
            if (from && to) onApply({ from, to })
          }}
        >
          {t("dashboard.custom_apply")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
