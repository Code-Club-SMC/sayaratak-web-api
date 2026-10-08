import type { Locale } from "@/schemas/locale"

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

// Thousands separators for any count (views, results, mileage).
export const formatNumber = (n: number, locale: Locale) =>
  new Intl.NumberFormat(locale, base).format(n)

// Whole SDG pounds split into amount and unit so PriceText can style the unit quietly.
export const formatPrice = (amount: number, locale: Locale) => ({
  amount: formatNumber(amount, locale),
  unit: units[locale].price,
})

// Calendar date for an ISO string, always in Khartoum time.
export const formatDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, {
    ...dateBase,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))

// "14:05" in Khartoum time, for the time under a message.
export const formatTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, {
    ...dateBase,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))

// "October 2025", for member-since lines.
export const formatMonthYear = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, {
    ...dateBase,
    month: "long",
    year: "numeric",
  }).format(new Date(iso))

// "3 hours ago" for the last month, then the plain date. `now` is passed in so SSR and hydration agree.
export function formatRelative(iso: string, now: number, locale: Locale) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { ...base, numeric: "auto" })
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
  new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    Date.UTC(2023, 0, 1 + day)
  )

// Day and month only, for chart axes.
export const formatShortDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, {
    ...dateBase,
    day: "numeric",
    month: "short",
  }).format(new Date(iso))

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
