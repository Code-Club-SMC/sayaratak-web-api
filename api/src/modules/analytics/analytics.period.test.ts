import { afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test"
import {
  adminStatsSchema,
  analyticsSchema,
} from "@sayaratak/shared/schemas/responses"
import { asc, eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listings } from "~/modules/listings/listings.tables"
import {
  messages,
  threadParticipants,
} from "~/modules/messaging/messaging.tables"

import {
  expectSchema,
  req,
  resetDb,
  type SignedIn,
  signIn,
} from "../../../tests/helpers"
import { eventsMonthly } from "./analytics.tables"

// Step 11.7-r1: custom minutes, the year comparison and the rolled-up months.
const NOON = new Date("2026-11-01T12:00:00Z")

let as: Record<"user" | "admin", SignedIn>

beforeAll(async () => {
  await resetDb()
  as = { user: await signIn("user"), admin: await signIn("admin") }
})
afterEach(() => spyOn(clock, "now").mockRestore())

const mine = async (who: SignedIn, query: string) =>
  expectSchema(
    await req(`/me/analytics${query}`, { headers: { cookie: who.cookie } }),
    analyticsSchema
  )

describe("report periods", () => {
  test("a custom range counts messages by the exact Khartoum minutes", async () => {
    spyOn(clock, "now").mockReturnValue(NOON)
    const [thread] = await db
      .select({ threadId: threadParticipants.threadId })
      .from(threadParticipants)
      .where(eq(threadParticipants.userId, "u-omar"))
      .orderBy(asc(threadParticipants.threadId))
    const sender = (
      await db
        .select({ userId: threadParticipants.userId })
        .from(threadParticipants)
        .where(eq(threadParticipants.threadId, thread?.threadId ?? ""))
    ).find((row) => row.userId !== "u-omar")
    const query = "?from=2026-10-31T08:00&to=2026-10-31T10:00"
    const before = await mine(as.user, query)
    expect(before.period.custom).toBe(true)
    expect(before.daily.map((d) => d.date)).toEqual(["2026-10-31"])
    // 05:59 UTC is 07:59 in Khartoum (outside), 06:30 UTC is 08:30 (inside).
    for (const [id, at] of [
      ["m-early", "2026-10-31T05:59:00Z"],
      ["m-inside", "2026-10-31T06:30:00Z"],
    ] as const)
      await db.insert(messages).values({
        id,
        threadId: thread?.threadId ?? "",
        senderId: sender?.userId ?? "",
        body: "x",
        createdAt: new Date(at),
      })
    const after = await mine(as.user, query)
    expect(after.totals.messages).toBe(before.totals.messages + 1)
  })

  test("compare=year reads the same dates a year earlier, lined up", async () => {
    spyOn(clock, "now").mockReturnValue(NOON)
    const body = await mine(as.user, "?range=7d&compare=year")
    expect(body.period.compareFrom).toBe("2025-10-26T00:00")
    expect(body.period.compareTo).toBe("2025-11-02T00:00")
    // October 2025 is older than the 13 months kept per day: the chart stays daily and views are not compared.
    expect(body.period.rolledUp).toBe(false)
    expect(body.period.granularity).toBe("day")
    expect(body.period.eventsCompared).toBe(false)
    expect(body.previousDaily).toHaveLength(body.daily.length)
  })

  test("a long range is weekly, and rolled-up months count per month", async () => {
    spyOn(clock, "now").mockReturnValue(NOON)
    const weekly = await mine(
      as.user,
      "?from=2026-03-01T00:00&to=2026-11-01T00:00"
    )
    expect(weekly.period.granularity).toBe("week")
    expect(weekly.daily[1]?.date).toBe("2026-03-08")
    const [row] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.ownerUserId, "u-omar"))
      .orderBy(asc(listings.id))
    await db.insert(eventsMonthly).values({
      month: "2025-06-01",
      targetId: row?.id ?? "",
      type: "view",
      count: 777,
    })
    const old = await mine(
      as.user,
      "?from=2025-06-10T00:00&to=2025-08-01T00:00"
    )
    expect(old.period.granularity).toBe("month")
    expect(old.daily.map((d) => d.date)).toEqual(["2025-06-10", "2025-07-01"])
    expect(old.daily[0]?.views).toBe(777)
  })

  test("admin stats take the same period and answer the compare window", async () => {
    spyOn(clock, "now").mockReturnValue(NOON)
    const body = adminStatsSchema.parse(
      await (
        await req("/admin/stats?from=2026-10-01T00:00&to=2026-11-01T00:00", {
          headers: { cookie: as.admin.cookie },
        })
      ).json()
    )
    expect(body.series.newUsers).toHaveLength(31)
    expect(body.previousSeries.newUsers).toHaveLength(31)
    expect(body.period.compareFrom).toBe("2026-08-31T00:00")
  })
})
