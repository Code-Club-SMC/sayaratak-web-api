import { beforeEach, describe, expect, test } from "bun:test"
import { broadcastSchema } from "@sayaratak/shared/schemas/api"
import { pageOf } from "@sayaratak/shared/schemas/fields"
import { and, eq, sql } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { auditLog } from "~/modules/audit/audit.tables"
import { user } from "~/modules/auth/auth.tables"
import { dealerships } from "~/modules/businesses/businesses.tables"
import { fanOut } from "~/modules/notifications/notifications.fanout.service"
import { notifications } from "~/modules/notifications/notifications.tables"

import { adminCaller, errorOf } from "../../../tests/admin"
import { expectSchema, resetDb } from "../../../tests/helpers"

// Seed: 61 individuals (2 banned), 12 dealerships, 14 workshops, 18 mechanics, all reading announcements.
let call = adminCaller()
beforeEach(async () => {
  await resetDb()
  call = adminCaller()
})

const message = {
  title: { ar: "أهلا", en: "Hello" },
  body: { ar: "رسالة", en: "A message" },
}
const send = (audience: object, extra: object = {}) =>
  call("POST", "/admin/broadcasts", {
    verifiedOnly: false,
    ...message,
    ...audience,
    ...extra,
  })
const bellsOf = (title: string) =>
  db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "broadcast"),
        sql`${notifications.title} ->> 'en' = ${title}`
      )
    )
const stopAnnouncements = (userId: string) =>
  db
    .update(user)
    .set({ prefs: sql`jsonb_set(${user.prefs}, '{announcements}', 'false')` })
    .where(eq(user.id, userId))

describe("POST /admin/broadcasts", () => {
  test("queues the announcement at once; the job rings the bell of every account in the audience once", async () => {
    await stopAnnouncements("ud-2")
    const res = await send({ roles: ["dealership"] }, { href: "/search" })
    expect(res.status).toBe(200)
    const sent = await expectSchema(res, broadcastSchema)
    expect(sent).toMatchObject({
      roles: ["dealership"],
      verifiedOnly: false,
      status: "queued",
      recipients: 0,
      title: message.title,
      href: "/search",
    })
    // Nothing rings until the job runs.
    expect(await bellsOf("Hello")).toEqual([])

    expect(await fanOut()).toBe(11)

    const bells = await bellsOf("Hello")
    expect(bells).toHaveLength(11)
    expect(bells.every((bell) => bell.href === "/search")).toBe(true)
    expect(bells.map((bell) => bell.userId)).not.toContain("ud-2")
    const listed = await expectSchema(
      await call("GET", "/admin/broadcasts"),
      pageOf(broadcastSchema)
    )
    expect(listed.items[0]).toMatchObject({
      id: sent.id,
      status: "sent",
      recipients: 11,
    })
    const [row] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, sent.id))
    expect(row).toMatchObject({
      action: "broadcast.send",
      targetType: "broadcast",
      adminId: "u-admin",
      after: { status: "queued", recipients: 0 },
    })
  })

  test("sends to the verified businesses of one city only", async () => {
    const shops = await db.select().from(dealerships)
    const target = shops.find((row) => row.verified)
    const wanted = shops.filter(
      (row) => row.verified && row.cityId === target?.cityId
    )
    const res = await send(
      { roles: ["dealership"], cityId: target?.cityId, verifiedOnly: true },
      { title: { ar: "ع", en: "Verified" } }
    )
    expect(res.status).toBe(200)
    expect(await fanOut()).toBe(wanted.length)
    expect(
      (await bellsOf("Verified")).map((bell) => bell.userId).sort()
    ).toEqual(wanted.map((row) => row.ownerUserId).sort())
  })

  test("answers 422 for a city that does not exist, a missing role or a long title, and sends nothing", async () => {
    const city = await send({ roles: ["user"], cityId: "nowhere" })
    expect(city.status).toBe(422)
    expect((await errorOf(city)).fields).toEqual({
      cityId: "validation.required",
    })
    expect((await send({ roles: [] })).status).toBe(422)
    expect(
      (
        await send(
          { roles: ["user"] },
          { title: { ar: "ع", en: "x".repeat(81) } }
        )
      ).status
    ).toBe(422)
    expect(await bellsOf("Hello")).toEqual([])
    const list = await expectSchema(
      await call("GET", "/admin/broadcasts"),
      pageOf(broadcastSchema)
    )
    expect(list.total).toBe(0)
  })
})

describe("GET /admin/broadcasts", () => {
  test("lists the history newest first and finds a title in either language", async () => {
    await send({ roles: ["mechanic"] }, { title: { ar: "عرض", en: "Offer" } })
    await send({ roles: ["workshop"] }, { title: { ar: "خبر", en: "News" } })
    await fanOut()
    const all = await expectSchema(
      await call("GET", "/admin/broadcasts"),
      pageOf(broadcastSchema)
    )
    expect(all.items.map((row) => row.title.en)).toEqual(["News", "Offer"])
    expect(all.items.map((row) => row.recipients)).toEqual([14, 18])
    for (const [term, expected] of [
      ["off", ["Offer"]],
      ["خبر", ["News"]],
      ["zzz", []],
    ] as const) {
      const found = await expectSchema(
        await call("GET", `/admin/broadcasts?q=${encodeURIComponent(term)}`),
        pageOf(broadcastSchema)
      )
      expect(found.items.map((row) => row.title.en)).toEqual([...expected])
    }
  })
})
