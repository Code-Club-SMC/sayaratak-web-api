import type { WeeklyHours } from "@/schemas/fields"

const KHARTOUM_OFFSET_MS = 2 * 3_600_000

// Open now from weekly hours, on the Khartoum clock (UTC+2, no daylight saving). `now` is passed in so SSR and hydration agree.
export function isOpenNow(hours: WeeklyHours, now: number) {
  const t = new Date(now + KHARTOUM_OFFSET_MS)
  const today = hours.find((h) => h.day === t.getUTCDay())
  const hm = `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
  return Boolean(today && !today.closed && today.open <= hm && hm < today.close)
}
