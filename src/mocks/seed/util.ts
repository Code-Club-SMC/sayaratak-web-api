import { faker } from "@faker-js/faker"

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
// Every timestamp is relative to the moment the seed runs, so "posted 3 hours ago" stays believable.
export const clock = { now: 0 }
export const ago = (ms: number) => new Date(clock.now - ms).toISOString()
export const ahead = (ms: number) => new Date(clock.now + ms).toISOString()
export const pick = <T>(items: readonly T[]): T =>
  faker.helpers.arrayElement(items)
export const int = (min: number, max: number) => faker.number.int({ min, max })
export const chance = (p: number) => faker.datatype.boolean({ probability: p })
export const pad = (n: number, width = 2) => String(n).padStart(width, "0")
export const roundTo = (n: number, step: number) => Math.round(n / step) * step
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
export const jitter = (n: number, spread = 0.04) =>
  n + (faker.number.float() - 0.5) * spread * 2
