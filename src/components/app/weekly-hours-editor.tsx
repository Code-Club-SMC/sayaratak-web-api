import { formatWeekday } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { WeeklyHours } from "@/schemas/fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "./field-error"

// Sudan's week starts on Saturday. `day` is 0 for Sunday, as in `isOpenNow`.
const SAT_FIRST = [6, 0, 1, 2, 3, 4, 5]

const preset = (open: string, close: string, closedDay?: number): WeeklyHours =>
  Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: day === closedDay,
    open,
    close,
  }))

export function WeeklyHoursEditor({
  value,
  onChange,
  error,
}: {
  value: WeeklyHours
  onChange: (value: WeeklyHours) => void
  error?: string
}) {
  const { t, locale } = useT()
  const patch = (day: number, change: Partial<WeeklyHours[number]>) =>
    onChange(value.map((r) => (r.day === day ? { ...r, ...change } : r)))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ui font-medium">{t("form.presets")}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(preset("08:00", "17:00", 5))}
        >
          {t("form.preset_business")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(preset("08:00", "22:00"))}
        >
          {t("form.preset_daily")}
        </Button>
      </div>
      {SAT_FIRST.map((day) => {
        const row = value.find((r) => r.day === day)
        if (!row) return null
        const name = formatWeekday(day, locale)
        const invalid = !row.closed && row.open >= row.close
        return (
          <div
            key={day}
            role="group"
            aria-label={name}
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            <span className="w-24 text-ui font-medium">{name}</span>
            <Label className="min-h-11 font-normal">
              <Checkbox
                checked={row.closed}
                onCheckedChange={(closed) => patch(day, { closed })}
              />
              {t("hours.closed")}
            </Label>
            <Input
              type="time"
              dir="ltr"
              className="w-32"
              aria-label={`${t("form.open_from")}, ${name}`}
              aria-invalid={invalid}
              disabled={row.closed}
              value={row.open}
              onChange={(e) => patch(day, { open: e.target.value })}
            />
            <Input
              type="time"
              dir="ltr"
              className="w-32"
              aria-label={`${t("form.close_at")}, ${name}`}
              aria-invalid={invalid}
              disabled={row.closed}
              value={row.close}
              onChange={(e) => patch(day, { close: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`${t("form.copy_to_all")}, ${name}`}
              onClick={() =>
                onChange(value.map((r) => ({ ...row, day: r.day })))
              }
            >
              {t("form.copy_to_all")}
            </Button>
          </div>
        )
      })}
      <FieldError message={error} />
    </div>
  )
}
