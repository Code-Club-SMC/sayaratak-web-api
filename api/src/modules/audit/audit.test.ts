import { beforeEach, describe, expect, test } from "bun:test"
import { eq } from "drizzle-orm"

import { user } from "~/modules/auth/auth.tables"
import { db } from "~/shared/db/client"

import { resetDb } from "../../../tests/helpers"
import { auditLog } from "./audit.tables"

beforeEach(resetDb)

describe("audit log table", () => {
  test("keeps an admin's rows with no admin when that account is deleted", async () => {
    await db.insert(auditLog).values({
      id: "au-1",
      adminId: "u-admin",
      action: "listing.approve",
      targetType: "listing",
      targetId: "l00001",
      createdAt: new Date(),
    })
    await db.delete(user).where(eq(user.id, "u-admin"))
    const [row] = await db.select({ admin: auditLog.adminId }).from(auditLog)
    expect(row).toEqual({ admin: null })
  })
})
