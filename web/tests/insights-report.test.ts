import { describe, expect, test } from "vitest"

import {
  buildMarketplaceReport,
  type MarketInput,
} from "@sayaratak/shared/lib/marketplace-report"
import { bucketsOf, resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildUsersReport,
  deviceOf,
  type UserInput,
} from "@sayaratak/shared/lib/users-report"
import {
  marketplaceReportSchema,
  usersReportSchema,
} from "@sayaratak/shared/schemas/reports-insights"

// Step 11.7-r10 admin Insights rules, checked on the shared builders the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const day = (days: number) => ago(days).slice(0, 10)
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const buckets = (first: string, last: string) => ({
  starts: bucketsOf(first, last, "day"),
  end: last,
  hourly: false,
})
const current = buckets("2026-10-20", "2026-11-18")
const compare = buckets("2026-09-20", "2026-10-19")

const listing = (id: string, over: Partial<MarketInput> = {}): MarketInput => ({
  id,
  ownerUserId: "u-1",
  kind: "vehicle",
  intent: "sale",
  condition: "used",
  makeId: "toyota",
  modelId: "corolla",
  year: 2015,
  rentPeriod: null,
  price: 10_000,
  status: "available",
  expiresAt: ago(-30),
  soldAt: null,
  vehicleType: "car",
  cityId: "khartoum",
  moderation: "approved",
  createdAt: ago(20),
  decidedAt: null,
  firstContactDay: null,
  ...over,
})

const market = (listings: MarketInput[]) =>
  marketplaceReportSchema.parse(
    buildMarketplaceReport({ period, listings, current, compare, now: NOW })
  )

describe("Marketplace", () => {
  test("contacted in the first 7 days; a young listing without contact waits", () => {
    const r = market([
      listing("a", { firstContactDay: day(17) }),
      listing("b", { firstContactDay: day(5) }),
      listing("c"),
      listing("d", { createdAt: ago(2) }),
      listing("e", { createdAt: ago(2), firstContactDay: day(1) }),
    ])
    // a and e yes, b (day 15) and c no, d still inside its week.
    expect(r.contacted).toMatchObject({ base: 4, rate: 50 })
  })

  test("lifecycle of the period's listings and the splits", () => {
    const r = market([
      listing("a"),
      listing("b", { moderation: "pending" }),
      listing("c", { status: "sold", soldAt: ago(3) }),
      listing("d", { expiresAt: ago(1) }),
      listing("e", { kind: "part", vehicleType: null, intent: "rent" }),
      listing("old", { createdAt: ago(200) }),
    ])
    const of = (state: string) =>
      r.lifecycle.find((s) => s.state === state)?.count
    expect([of("live"), of("pending"), of("sold"), of("expired")]).toEqual([
      2, 1, 1, 1,
    ])
    expect(r.liveNow).toBe(3)
    expect(r.created.count).toBe(5)
    expect(r.sold.count).toBe(1)
    expect(r.byType.find((t) => t.key === "part")).toEqual({
      key: "part",
      live: 1,
      created: 1,
    })
    expect(r.byIntent.find((t) => t.key === "rent")?.live).toBe(1)
  })

  test("typical price needs 5 listings of a model and condition", () => {
    const prices = [8, 9, 10, 11, 40].map((m) => m * 1_000_000)
    const r = market([
      ...prices.map((price, i) => listing(`p${i}`, { price })),
      ...[1, 2, 3, 4].map((i) =>
        listing(`n${i}`, { condition: "new", price: 1 })
      ),
    ])
    expect(r.prices).toEqual([
      {
        makeId: "toyota",
        modelId: "corolla",
        condition: "used",
        count: 5,
        median: 10_000_000,
        low: 9_000_000,
        high: 11_000_000,
      },
    ])
  })
})

describe("Users", () => {
  const user = (id: string, over: Partial<UserInput> = {}): UserInput => ({
    id,
    role: "user",
    locale: "ar",
    createdAt: ago(100),
    method: "email",
    ...over,
  })
  const users = [
    user("a", { createdAt: ago(3), method: "google", role: "dealership" }),
    user("b", { locale: "en" }),
    user("c"),
  ]
  const activity = [
    { day: day(0), userId: "a", device: "phone_web" as const },
    { day: day(0), userId: "b", device: "computer_web" as const },
    { day: day(1), userId: "a", device: "android_app" as const },
    { day: day(20), userId: "c", device: "phone_web" as const },
  ]
  const r = usersReportSchema.parse(
    buildUsersReport({
      period,
      users,
      activity,
      activeSince: day(1),
      current,
      compare,
    })
  )

  test("sign-ups by role and method", () => {
    expect(r.signups.count).toBe(1)
    expect(r.byRole.find((x) => x.key === "dealership")?.count).toBe(1)
    expect(r.byMethod.find((x) => x.key === "google")?.count).toBe(1)
  })

  test("active per day counts from the first recorded day; week and month", () => {
    // Two recorded days: 1 then 2 accounts.
    expect(r.dau.value).toBe(2)
    expect(r.wau).toBe(2)
    expect(r.mau).toBe(3)
  })

  test("devices and languages of active accounts", () => {
    expect(r.devices.map((d) => d.count)).toEqual([2, 1, 1, 0])
    expect(r.languages).toEqual([
      { key: "ar", accounts: 2, active: 2 },
      { key: "en", accounts: 1, active: 1 },
    ])
  })

  test("device of a request", () => {
    expect(deviceOf("android", "")).toBe("android_app")
    expect(deviceOf("ios", "")).toBe("ios_app")
    expect(deviceOf(undefined, "Mozilla/5.0 (iPhone) Mobile")).toBe("phone_web")
    expect(deviceOf("web", "Mozilla/5.0 (X11; Linux x86_64)")).toBe(
      "computer_web"
    )
  })
})
