import { describe, expect, test } from "vitest"

import {
  alignStarts,
  alignTo,
  bucketsOf,
  ceilHour,
  daysOf,
  firstDailyDay,
  firstHourlyDay,
  hoursOf,
  instantOf,
  resolvePeriod,
  slicesOf,
  sumInto,
} from "@sayaratak/shared/lib/period"
import {
  compareSchema,
  granularitySchema,
  periodQuerySchema,
  periodSchema,
} from "@sayaratak/shared/schemas/period"

const TODAY = "2026-11-01"
const parse = (q: Record<string, string>) => periodQuerySchema.parse(q)

describe("periodQuerySchema", () => {
  test("broken values fall back to 30 days against the period before", () => {
    expect(parse({ range: "1y", from: "x", compare: "z" })).toEqual({
      range: "30d",
      from: undefined,
      to: undefined,
      compare: "previous",
    })
    expect(compareSchema.options).toEqual(["previous", "year"])
    expect(granularitySchema.options).toEqual(["hour", "day", "week", "month"])
  })
})

describe("resolvePeriod", () => {
  test("a preset is whole days ending today, compared with the days before", () => {
    const p = periodSchema.parse(resolvePeriod(parse({ range: "7d" }), TODAY))
    expect(p).toMatchObject({
      from: "2026-10-26T00:00",
      to: "2026-11-02T00:00",
      compareFrom: "2026-10-19T00:00",
      compareTo: "2026-10-26T00:00",
      granularity: "day",
      custom: false,
      rolledUp: false,
      eventsCompared: true,
    })
  })

  test("custom minutes win; a reversed range falls back to the preset", () => {
    const ok = resolvePeriod(
      parse({ from: "2026-10-31T08:00", to: "2026-10-31T17:00" }),
      TODAY
    )
    expect(ok).toMatchObject({ custom: true, compareFrom: "2026-10-30T23:00" })
    const bad = resolvePeriod(
      parse({ from: "2026-10-31T17:00", to: "2026-10-31T08:00" }),
      TODAY
    )
    expect(bad.custom).toBe(false)
  })

  test("buckets widen with length, and the current window reaching rolled months is monthly", () => {
    const g = (from: string, to: string) =>
      resolvePeriod(parse({ from, to }), TODAY).granularity
    expect(g("2026-08-02T00:00", "2026-11-02T00:00")).toBe("day")
    expect(g("2026-03-01T00:00", "2026-11-01T00:00")).toBe("week")
    expect(g("2025-06-01T00:00", "2025-08-01T00:00")).toBe("month")
  })

  test("a year comparison reaching rolled months keeps day buckets and drops event comparison", () => {
    const p = resolvePeriod(parse({ range: "90d", compare: "year" }), TODAY)
    expect(p.granularity).toBe("day")
    expect(p.eventsCompared).toBe(false)
    expect(p.compareFrom).toBe("2025-08-04T00:00")
  })

  test("29 February a year back is the 28th", () => {
    const p = resolvePeriod(
      parse({
        from: "2028-02-29T00:00",
        to: "2028-03-01T00:00",
        compare: "year",
      }),
      "2028-03-05"
    )
    expect(p.compareFrom).toBe("2027-02-28T00:00")
  })
})

describe("buckets", () => {
  test("weeks count from the first day; months are calendar months", () => {
    expect(bucketsOf("2026-10-01", "2026-10-20", "week")).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
    ])
    expect(bucketsOf("2026-10-20", "2027-01-05", "month")).toEqual([
      "2026-10-20",
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
    ])
  })

  test("sumInto drops days outside, alignTo and alignStarts pad", () => {
    const starts = ["2026-10-01", "2026-10-08"]
    expect(
      sumInto(starts, "2026-10-14", [
        ["2026-09-30", 9],
        ["2026-10-01", 1],
        ["2026-10-09", 2],
        ["2026-10-15", 9],
      ])
    ).toEqual([1, 2])
    expect(alignTo([1], 3)).toEqual([1, 0, 0])
    expect(alignStarts(["a", "b"], 3)).toEqual(["a", "b", "b"])
  })

  test("days, the kept window and Khartoum instants", () => {
    expect(daysOf("2026-10-31T08:00", "2026-11-01T00:00")).toEqual({
      first: "2026-10-31",
      last: "2026-10-31",
    })
    expect(firstDailyDay("2026-11-18")).toBe("2025-11-01")
    expect(firstDailyDay("2026-01-05")).toBe("2025-01-01")
    expect(new Date(instantOf("2026-11-01T08:00")).toISOString()).toBe(
      "2026-11-01T06:00:00.000Z"
    )
  })
})

describe("hourly counters (step 11.7-r2)", () => {
  const hourly = (from: string, to: string) =>
    resolvePeriod(parse({ from, to }), TODAY)

  test("up to 2 days inside the 90 kept per hour has hour buckets", () => {
    expect(hourly("2026-10-30T08:00", "2026-11-01T08:00").granularity).toBe(
      "hour"
    )
    expect(hourly("2026-10-30T08:00", "2026-11-01T09:00").granularity).toBe(
      "day"
    )
    // Older than 90 days: no hours to read, so days.
    expect(hourly("2026-07-01T08:00", "2026-07-01T10:00").granularity).toBe(
      "day"
    )
    expect(hoursOf("2026-11-01T08:30", "2026-11-01T10:15")).toEqual([
      "2026-11-01T08:00",
      "2026-11-01T09:00",
      "2026-11-01T10:00",
    ])
    expect(ceilHour("2026-11-01T23:30")).toBe("2026-11-02T00:00")
    expect(firstHourlyDay("2026-11-18")).toBe("2026-08-21")
  })

  test("partial days read hours, whole days read days, old partial days count whole", () => {
    expect(
      slicesOf({
        from: "2026-10-28T08:00",
        to: "2026-10-31T10:30",
        today: TODAY,
        hourly: false,
      })
    ).toEqual({
      days: { first: "2026-10-29", last: "2026-10-30" },
      hours: [
        ["2026-10-28T08:00", "2026-10-29T00:00"],
        ["2026-10-31T00:00", "2026-10-31T11:00"],
      ],
    })
    expect(
      slicesOf({
        from: "2026-06-01T08:00",
        to: "2026-10-31T10:00",
        today: TODAY,
        hourly: false,
      })
    ).toEqual({
      days: { first: "2026-06-01", last: "2026-10-30" },
      hours: [["2026-10-31T00:00", "2026-10-31T10:00"]],
    })
    expect(hourly("2026-06-01T08:00", "2026-10-31T00:00").wholeDays).toBe(true)
    expect(hourly("2026-10-01T08:00", "2026-10-31T00:00").wholeDays).toBe(false)
  })

  test("hour buckets do not compare with a year earlier (no hours kept)", () => {
    const p = resolvePeriod(
      parse({
        from: "2026-10-31T08:00",
        to: "2026-10-31T12:00",
        compare: "year",
      }),
      TODAY
    )
    expect(p.granularity).toBe("hour")
    expect(p.eventsCompared).toBe(false)
  })
})
