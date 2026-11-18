type T = (key: string, options?: Record<string, unknown>) => string

// A wait in minutes as minutes (under an hour), hours (under 2 days) or days.
export function durationText(t: T, minutes: number) {
  if (minutes < 60) return t("reports.minutes", { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 48) return t("reports.hours", { count: hours })
  return t("reports.days", { count: Math.round(hours / 24) })
}
