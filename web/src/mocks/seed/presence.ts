import { addDays, minuteOf } from "@sayaratak/shared/lib/period"
import type { Device } from "@sayaratak/shared/schemas/reports-insights"

import type { ActivityRow, UserRow } from "../types"

const DAYS = 60
const DEVICES: [number, Device][] = [
  [55, "phone_web"],
  [80, "computer_web"],
  [95, "android_app"],
  [100, "ios_app"],
]

// FNV-1a: a fixed number per text, so the seed draws nothing from faker and the rest of the seed stays the same.
const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Step 11.7-r10: signed-in days of the last 60 Khartoum days; businesses come back more often than personal accounts. Each account has one usual device; one in four also uses a computer browser, one day in five. */
export function seedActivity(users: UserRow[], now: number): ActivityRow[] {
  const today = minuteOf(new Date(now).toISOString()).slice(0, 10)
  const rows: ActivityRow[] = []
  for (const u of users) {
    if (u.role === "admin") continue
    const joined = minuteOf(u.createdAt).slice(0, 10)
    const chance = u.role === "user" ? 20 : 55
    const pick = hash(u.id) % 100
    const usual = DEVICES.find(([below]) => pick < below)?.[1] ?? "phone_web"
    const laptop = (hash(u.id) >>> 8) % 4 === 0
    for (let d = DAYS - 1; d >= 0; d--) {
      const day = addDays(today, -d)
      const h = hash(`${u.id}|${day}`)
      if (day < joined || h % 100 >= chance) continue
      const device = laptop && (h >>> 8) % 5 === 0 ? "computer_web" : usual
      rows.push({ day, userId: u.id, device })
    }
  }
  return rows
}
