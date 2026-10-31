import { beforeEach, describe, expect, test } from "bun:test"
import { isNull, sql } from "drizzle-orm"

import { db } from "~/shared/db/client"

import { buildSeed, resetDb } from "../../../tests/helpers"
import { broadcasts, notifications } from "./notifications.tables"

const seeded = buildSeed()

beforeEach(resetDb)

describe("notification table", () => {
  test("holds every mock notification, read and unread", async () => {
    expect(await db.$count(notifications)).toBe(seeded.notifications.length)
    expect(await db.$count(notifications, isNull(notifications.readAt))).toBe(
      seeded.notifications.filter((n) => !n.readAt).length
    )
  })

  test("refuses a title missing a language", async () => {
    // Raw SQL: the column type would not let a one-language value through.
    const error = await db
      .execute(
        sql`update notifications set title = '{"ar": "x"}' where id = 'n-1'`
      )
      .catch((error) => error)
    expect(error.cause.constraint).toBe("notifications_title")
  })
})

describe("broadcast table", () => {
  test("refuses a broadcast with no role in its audience", async () => {
    const error = await db
      .insert(broadcasts)
      .values({
        id: "bc-1",
        title: { ar: "x", en: "x" },
        body: { ar: "x", en: "x" },
        roles: [],
        verifiedOnly: false,
        recipients: 0,
        createdAt: new Date(),
      })
      .catch((error) => error)
    expect(error.cause.constraint).toBe("broadcasts_roles")
  })
})
