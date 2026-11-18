import { afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test"
import { listingAnalyticsSchema } from "@sayaratak/shared/schemas/api"
import { analyticsSchema } from "@sayaratak/shared/schemas/responses"
import { and, asc, eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listings } from "~/modules/listings/listings.tables"

import {
  expectSchema,
  req,
  resetDb,
  type SignedIn,
  signIn,
} from "../../../tests/helpers"
import { pruneOldHours } from "./analytics.rollup.service"
import { events, eventsHourly } from "./analytics.tables"

// Step 11.7-r2: hourly counters. 2026-11-01 is a Sunday; noon UTC is 14:00 in Khartoum.
const NOON = new Date("2026-11-01T12:00:00Z")

let admin: SignedIn
let listingId = ""

beforeAll(async () => {
  await resetDb()
  admin = await signIn("admin")
  const [row] = await db
    .select({ id: listings.id })
    .from(listings)
    .orderBy(asc(listings.id))
  listingId = row?.id ?? ""
})
afterEach(() => spyOn(clock, "now").mockRestore())

const at = (now: Date) => spyOn(clock, "now").mockReturnValue(now)
const get = async <S extends typeof analyticsSchema>(path: string, schema: S) =>
  expectSchema(await req(path, { headers: { cookie: admin.cookie } }), schema)
const listingReport = async (query: string) =>
  expectSchema(
    await req(`/listings/${listingId}/analytics${query}`, {
      headers: { cookie: admin.cookie },
    }),
    listingAnalyticsSchema
  )

// Replaces the listing's counters with these daily and hourly view rows.
async function setViews(input: {
  days: [string, number][]
  hours: [string, number, number][]
}) {
  await db.delete(events).where(eq(events.targetId, listingId))
  await db.delete(eventsHourly).where(eq(eventsHourly.targetId, listingId))
  for (const [day, count] of input.days)
    await db
      .insert(events)
      .values({ day, targetId: listingId, type: "view", count })
  for (const [day, hour, count] of input.hours)
    await db
      .insert(eventsHourly)
      .values({ day, hour, targetId: listingId, type: "view", count })
}

describe("hourly counters", () => {
  test("an event counts in its Khartoum day and hour", async () => {
    // 22:30 UTC is 00:30 the next day in Khartoum.
    at(new Date("2026-10-31T22:30:00Z"))
    const res = await req("/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "phone_click", targetId: listingId }),
    })
    expect(res.status).toBe(200)
    const [row] = await db
      .select()
      .from(eventsHourly)
      .where(
        and(
          eq(eventsHourly.targetId, listingId),
          eq(eventsHourly.day, "2026-11-01"),
          eq(eventsHourly.hour, 0),
          eq(eventsHourly.type, "phone_click")
        )
      )
    expect(row?.count).toBeGreaterThanOrEqual(1)
  })

  test("a range of up to 2 days counts per hour", async () => {
    at(NOON)
    await setViews({
      days: [["2026-11-01", 99]],
      hours: [
        ["2026-11-01", 8, 3],
        ["2026-11-01", 9, 2],
        ["2026-11-01", 12, 5],
      ],
    })
    const body = await listingReport(
      "?from=2026-11-01T08:00&to=2026-11-01T10:00"
    )
    expect(body.period.granularity).toBe("hour")
    expect(body.series.map((s) => [s.day, s.views])).toEqual([
      ["2026-11-01T08:00", 3],
      ["2026-11-01T09:00", 2],
    ])
    expect(body.totals.views).toBe(5)
  })

  test("partial start and end days read hours, whole days read days", async () => {
    at(NOON)
    await setViews({
      days: [
        ["2026-10-28", 10],
        ["2026-10-29", 7],
        ["2026-10-30", 9],
      ],
      hours: [
        ["2026-10-28", 7, 4],
        ["2026-10-28", 8, 1],
        ["2026-10-30", 9, 2],
        ["2026-10-30", 11, 6],
      ],
    })
    const body = await listingReport(
      "?from=2026-10-28T08:00&to=2026-10-30T10:00"
    )
    expect(body.period.granularity).toBe("day")
    expect(body.series.map((s) => s.views)).toEqual([1, 7, 2])
  })

  test("the heatmap adds calls per Khartoum weekday and hour", async () => {
    at(NOON)
    const before = await get("/me/analytics?range=7d", analyticsSchema)
    await db.insert(eventsHourly).values({
      day: "2026-11-01",
      hour: 13,
      targetId: listingId,
      type: "whatsapp_click",
      count: 5,
    })
    const after = await get("/me/analytics?range=7d", analyticsSchema)
    // Sunday is weekday 0.
    expect((after.contactHours[13] ?? 0) - (before.contactHours[13] ?? 0)).toBe(
      5
    )
  })

  test("hourly counts start on the first day kept, at most 90 days back", async () => {
    at(NOON)
    await db.delete(eventsHourly)
    const since = async () =>
      (await get("/me/analytics?range=7d", analyticsSchema)).hourlySince
    expect(await since()).toBe("2026-11-01")
    const row = {
      hour: 1,
      targetId: listingId,
      type: "view",
      count: 1,
    } as const
    await db.insert(eventsHourly).values({ ...row, day: "2026-10-20" })
    expect(await since()).toBe("2026-10-20")
    await db.insert(eventsHourly).values({ ...row, day: "2026-06-01" })
    expect(await since()).toBe("2026-08-04")
  })

  test("the prune deletes hours older than 90 days and keeps the rest", async () => {
    at(NOON)
    await db.delete(eventsHourly)
    const row = {
      hour: 1,
      targetId: listingId,
      type: "view",
      count: 1,
    } as const
    await db.insert(eventsHourly).values([
      { ...row, day: "2026-08-03" },
      { ...row, day: "2026-08-04" },
    ])
    expect(await pruneOldHours()).toBe(1)
    const left = await db.select({ day: eventsHourly.day }).from(eventsHourly)
    expect(left).toEqual([{ day: "2026-08-04" }])
  })
})
