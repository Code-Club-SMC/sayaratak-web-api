import type { Locale } from "@sayaratak/shared/schemas/locale"

// Every number and date in the product goes through here: Latin digits, Gregorian calendar, Khartoum time.
const base = { numberingSystem: "latn" } as const
const dateBase = {
  ...base,
  calendar: "gregory",
  timeZone: "Africa/Khartoum",
} as const

const units = {
  ar: { price: "جنيه", mileage: "كم" },
  en: { price: "SDG", mileage: "km" },
} as const

// An Intl formatter costs far more to build than to use, and a table calls these once per cell, so each is built once per locale.
const perLocale = <T>(make: (locale: Locale) => T) => {
  const made = new Map<Locale, T>()
  return (locale: Locale) => {
    const known = made.get(locale)
    if (known) return known
    const next = make(locale)
    made.set(locale, next)
    return next
  }
}
const dateFormat = (options: Intl.DateTimeFormatOptions) =>
  perLocale((locale) => new Intl.DateTimeFormat(locale, options))

const numberFormat = perLocale((locale) => new Intl.NumberFormat(locale, base))
const dateFull = dateFormat({
  ...dateBase,
  day: "numeric",
  month: "short",
  year: "numeric",
})
const timeOnly = dateFormat({ ...dateBase, hour: "numeric", minute: "2-digit" })
const monthYear = dateFormat({ ...dateBase, month: "long", year: "numeric" })
const dayMonth = dateFormat({ ...dateBase, day: "numeric", month: "short" })
const dayLong = dateFormat({
  ...dateBase,
  weekday: "long",
  day: "numeric",
  month: "long",
})
const hour24 = dateFormat({ ...dateBase, hour: "numeric", hourCycle: "h23" })
const dayMonthTime = dateFormat({
  ...dateBase,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
})
const monthShort = dateFormat({ ...dateBase, month: "short", year: "numeric" })
const weekday = dateFormat({ weekday: "long", timeZone: "UTC" })
const weekdayShort = dateFormat({ weekday: "short", timeZone: "UTC" })
const relative = perLocale(
  (locale) => new Intl.RelativeTimeFormat(locale, { ...base, numeric: "auto" })
)

// Thousands separators for any count (views, results, mileage).
export const formatNumber = (n: number, locale: Locale) =>
  numberFormat(locale).format(n)

// Whole SDG pounds split into amount and unit so PriceText can style the unit quietly.
export const formatPrice = (amount: number, locale: Locale) => ({
  amount: formatNumber(amount, locale),
  unit: units[locale].price,
})

// Calendar date for an ISO string, always in Khartoum time.
export const formatDate = (iso: string, locale: Locale) =>
  dateFull(locale).format(new Date(iso))

// "14:05" in Khartoum time, for the time under a message.
export const formatTime = (iso: string, locale: Locale) =>
  timeOnly(locale).format(new Date(iso))

// "October 2025", for member-since lines.
export const formatMonthYear = (iso: string, locale: Locale) =>
  monthYear(locale).format(new Date(iso))

// "3 hours ago" for the last month, then the plain date. `now` is passed in so SSR and hydration agree.
export function formatRelative(iso: string, now: number, locale: Locale) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const rtf = relative(locale)
  const abs = Math.abs(seconds)
  if (abs < 45) return rtf.format(0, "second")
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour")
  if (abs < 30 * 86400) return rtf.format(Math.round(seconds / 86400), "day")
  return formatDate(iso, locale)
}

// Odometer reading with its unit.
export const formatMileage = (km: number, locale: Locale) =>
  `${formatNumber(km, locale)} ${units[locale].mileage}`

// Day name for a weekday number (0 = Sunday). 2023-01-01 was a Sunday.
export const formatWeekday = (day: number, locale: Locale) =>
  weekday(locale).format(Date.UTC(2023, 0, 1 + day))

// Short day name ("Sun") for a weekday number (0 = Sunday).
export const formatWeekdayShort = (day: number, locale: Locale) =>
  weekdayShort(locale).format(Date.UTC(2023, 0, 1 + day))

// Day and month only, for chart axes.
export const formatShortDate = (iso: string, locale: Locale) =>
  dayMonth(locale).format(new Date(iso))

// "1 Nov, 08:00" for a Khartoum wall-clock minute ("2026-11-01T08:00"); Khartoum is UTC+2 all year.
export const formatMinute = (minute: string, locale: Locale) =>
  dayMonthTime(locale).format(new Date(`${minute}:00+02:00`))

// A report bucket's first day: "1 Nov, 08:00" for hours (the key is a minute), "1 Nov" for days and weeks, "Nov 2026" for months.
export const formatBucket = (
  day: string,
  granularity: "hour" | "day" | "week" | "month",
  locale: Locale
) =>
  granularity === "hour"
    ? formatMinute(day, locale)
    : granularity === "month"
      ? monthShort(locale).format(new Date(`${day}T12:00:00Z`))
      : formatShortDate(day, locale)

// "08:00" for an hour of the day (0 to 23), Latin digits in both languages.
export const formatHour = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")

// "Thursday 20 November", for the overview greeting.
export const formatDayLong = (ms: number, locale: Locale) =>
  dayLong(locale).format(new Date(ms))

// The hour (0 to 23) in Khartoum, so the greeting says morning or evening by Khartoum time.
export const khartoumHour = (ms: number) =>
  Number(hour24("en").format(new Date(ms)))
