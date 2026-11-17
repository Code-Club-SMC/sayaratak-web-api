import { beforeEach, describe, expect, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { flushMail, testInbox } from "~/shared/mail/send"
import { user } from "~/modules/auth/auth.tables"
import { listings } from "~/modules/listings/listings.tables"
import { promotions } from "~/modules/promotions/promotions.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"
import { campaignReceipt, noticesTo } from "./admin-payments.test-helpers"

// Seed: pay-4 is u-mechanic's Plus receipt, pay-3 u-omar's bump, pay-1 u-omar's Plus;
// camp-2 (u-workshop) is under review; promo-1 runs on l0000e; l00006 has no promotion.
let call = adminCaller()
beforeEach(async () => {
  await resetDb()
  call = adminCaller()
  testInbox.length = 0
})

const emailOf = (id: string) =>
  db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .then(([row]) => row?.email ?? "")

/** The mails delivered to one account after every pending send finished. */
async function inboxOf(userId: string) {
  await flushMail()
  const to = await emailOf(userId)
  return testInbox.filter((mail) => mail.to === to)
}

describe("payment decision emails", () => {
  test("an approved plan mails the payer its end date, amount and references", async () => {
    expect((await call("POST", "/admin/payments/pay-4/approve")).status).toBe(
      200
    )
    const [mail, ...more] = await inboxOf("u-mechanic")
    expect(more).toHaveLength(0)
    expect(mail?.template).toBe("payment-approved")
    expect(mail?.text).toMatch(/active until|فعّال حتى/)
    expect(mail?.text).toContain("SY-")
    expect(mail?.html).toContain("http://localhost:3000/")
    expect(mail?.html).toContain("/mechanic/billing")
  })

  test("a rejection mails the reason, even with billing notices switched off", async () => {
    const [omar] = await db.select().from(user).where(eq(user.id, "u-omar"))
    if (!omar) throw new Error("seed lost u-omar")
    await db
      .update(user)
      .set({ prefs: { ...omar.prefs, billing: false } })
      .where(eq(user.id, "u-omar"))
    const res = await call("POST", "/admin/payments/pay-1/reject", {
      reason: "Receipt is blurry",
    })
    expect(res.status).toBe(200)
    expect(await noticesTo("u-omar", "payment_rejected")).toHaveLength(0)
    const [mail] = await inboxOf("u-omar")
    expect(mail?.template).toBe("payment-rejected")
    expect(mail?.text).toContain("Receipt is blurry")
  })

  test("an approved bump says the listing moved to the top", async () => {
    await call("POST", "/admin/payments/pay-3/approve")
    const [mail] = await inboxOf("u-omar")
    expect(mail?.text).toMatch(/top of the newest|أعلى قائمة أحدث/)
  })

  test("a campaign decided on the ads page mails its dates and links to the campaigns", async () => {
    await campaignReceipt()
    expect((await call("POST", "/admin/campaigns/camp-2/approve")).status).toBe(
      200
    )
    const [mail, ...more] = await inboxOf("u-workshop")
    expect(more).toHaveLength(0)
    expect(mail?.template).toBe("payment-approved")
    expect(mail?.html).toContain("/workshop/ads")
  })

  test("a campaign rejected on the payments page mails once", async () => {
    await campaignReceipt()
    await call("POST", "/admin/payments/pay-camp/reject", {
      reason: "Wrong amount",
    })
    const mails = await inboxOf("u-workshop")
    expect(mails).toHaveLength(1)
    expect(mails[0]?.text).toContain("Wrong amount")
  })
})

describe("admin promotion emails", () => {
  const ownerOf = (listingId: string) =>
    db
      .select({ id: listings.ownerUserId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .then(([row]) => row?.id ?? "")

  test("a granted Featured mails the owner its end date", async () => {
    await call("POST", "/admin/promotions/grant", {
      listingId: "l00006",
      type: "featured",
      days: 5,
    })
    const [mail] = await inboxOf(await ownerOf("l00006"))
    expect(mail?.template).toBe("promotion-granted")
    expect(mail?.text).toMatch(/live until|فعّالًا حتى/)
  })

  test("ending a promotion mails the owner", async () => {
    const [promo] = await db
      .select({ listingId: promotions.listingId })
      .from(promotions)
      .where(eq(promotions.id, "promo-1"))
    expect((await call("POST", "/admin/promotions/promo-1/end")).status).toBe(
      200
    )
    const [mail] = await inboxOf(await ownerOf(promo?.listingId ?? ""))
    expect(mail?.template).toBe("promotion-ended")
  })
})
