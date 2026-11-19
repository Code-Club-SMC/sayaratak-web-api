import { z } from "zod"

import { roleSchema } from "./fields"
import { intentSchema, typeFilterSchema } from "./listing"
import { localeSchema } from "./locale"
import { periodSchema } from "./period"

// Admin Insights (step 11.7-r10, owner 2026-11-19): the Marketplace and Users tabs.

// Where a signed-in request came from: the apps send `X-Platform`, browsers are split by their user agent.
export const deviceSchema = z.enum([
  "phone_web",
  "computer_web",
  "android_app",
  "ios_app",
])
export type Device = z.infer<typeof deviceSchema>

// How an account was made: email and password, or a social provider.
export const signupMethodSchema = z.enum([
  "email",
  "google",
  "facebook",
  "apple",
])
export type SignupMethod = z.infer<typeof signupMethodSchema>

// A listing created in the period, by where it stands now.
export const lifecycleStateSchema = z.enum([
  "pending",
  "live",
  "sold",
  "expired",
  "rejected",
  "removed",
])
export type LifecycleState = z.infer<typeof lifecycleStateSchema>

const int = z.number().int()
const countSchema = z.object({ count: int, previous: int })
// Whole numbers; null when nothing was measured.
const medianSchema = z.object({
  median: int.nullable(),
  previous: int.nullable(),
})
const shareRow = <T extends z.ZodType>(key: T) =>
  z.object({ key, live: int, created: int })

export const marketplaceReportSchema = z.object({
  period: periodSchema,
  // Approved, available or reserved, not expired.
  liveNow: int,
  // Listings created in the window (drafts never count).
  created: countSchema,
  // Sold or rented in the window.
  sold: countSchema,
  // Whole % of the listings that went live in the window with a call, WhatsApp or message in their first 7 days; listings under 7 days old with no contact yet are left out. `base` is how many counted.
  contacted: z.object({
    rate: int.nullable(),
    previous: int.nullable(),
    base: int,
  }),
  // Whole days from going live to sold, for listings sold in the window.
  daysToSell: medianSchema,
  // Whole hours from creation to the admin decision, for listings decided in the window.
  decisionHours: medianSchema,
  lifecycle: z.array(z.object({ state: lifecycleStateSchema, count: int })),
  series: z.array(z.object({ date: z.string(), created: int, sold: int })),
  previousSeries: z.array(
    z.object({ date: z.string(), created: int, sold: int })
  ),
  byType: z.array(shareRow(typeFilterSchema)),
  byIntent: z.array(shareRow(intentSchema)),
  // City ids, most live first.
  byCity: z.array(shareRow(z.string())),
  // Typical (middle) price of sale vehicles live now or sold in the last 90 days, per make, model and new/used, 5 or more listings; most listings first, top 50.
  prices: z.array(
    z.object({
      makeId: z.string(),
      modelId: z.string(),
      condition: z.enum(["new", "used"]),
      count: int,
      median: int,
      low: int,
      high: int,
    })
  ),
})
export type MarketplaceReport = z.infer<typeof marketplaceReportSchema>

const usersPoint = z.object({
  date: z.string(),
  signups: int,
  // Distinct active accounts in the bucket; null with hour buckets (activity is kept per day).
  active: int.nullable(),
})

export const usersReportSchema = z.object({
  period: periodSchema,
  accounts: int,
  signups: countSchema,
  // Average distinct active accounts per day; null before activity was recorded.
  dau: z.object({ value: int.nullable(), previous: int.nullable() }),
  // Distinct active accounts in the 7 and 30 days up to the period's last day.
  wau: int,
  mau: int,
  // The first day with activity rows (they start on deploy); null when none yet.
  activeSince: z.string().nullable(),
  series: z.array(usersPoint),
  previousSeries: z.array(usersPoint),
  // Sign-ups in the period.
  byRole: z.array(z.object({ key: roleSchema, count: int })),
  byMethod: z.array(z.object({ key: signupMethodSchema, count: int })),
  // Distinct active accounts in the period per device; one account can use several.
  devices: z.array(z.object({ key: deviceSchema, count: int })),
  // Account language: every account, and those active in the period.
  languages: z.array(
    z.object({ key: localeSchema, accounts: int, active: int })
  ),
})
export type UsersReport = z.infer<typeof usersReportSchema>
