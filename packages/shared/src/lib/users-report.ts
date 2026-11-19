import { roleSchema, type Role } from "../schemas/fields"
import { localeSchema, type Locale } from "../schemas/locale"
import type { Period } from "../schemas/period"
import {
  type Device,
  deviceSchema,
  type SignupMethod,
  signupMethodSchema,
  type UsersReport,
} from "../schemas/reports-insights"
import {
  addDays,
  alignStarts,
  alignTo,
  type Buckets,
  daysOf,
  sumTimed,
  within,
} from "./period"

const PHONE_UA = /Mobi|Android|iPhone|iPad|iPod/i

/** The device of a signed-in request: the app's `X-Platform`, else phone or computer browser by user agent (step 11.7-r10). */
export function deviceOf(
  platform: string | null | undefined,
  userAgent: string | null | undefined
): Device {
  if (platform === "android") return "android_app"
  if (platform === "ios") return "ios_app"
  return PHONE_UA.test(userAgent ?? "") ? "phone_web" : "computer_web"
}

// What the API and the mock read per account and per active account-day.
export type UserInput = {
  id: string
  role: Role
  locale: Locale
  createdAt: string
  method: SignupMethod
}
export type ActivityInput = { day: string; userId: string; device: Device }

/** The days the report needs activity for: the compare window and the 30 days up to the period's last day. */
export function activityDaysOf(period: Period) {
  const last = daysOf(period.from, period.to).last
  const first = [
    daysOf(period.compareFrom, period.compareTo).first,
    addDays(last, -29),
  ].sort()[0]
  return { first: first ?? last, last }
}

const distinct = (rows: ActivityInput[]) =>
  new Set(rows.map((r) => r.userId)).size

// Distinct active accounts per bucket; null with hour buckets (activity is kept per day).
function activeOf(activity: ActivityInput[], b: Buckets, length: number) {
  if (b.hourly) return Array.from({ length }, () => null)
  return alignTo(
    b.starts.map((start, i) => {
      const next = b.starts[i + 1]
      return distinct(
        activity.filter(
          (a) => a.day >= start && a.day <= b.end && (!next || a.day < next)
        )
      )
    }),
    length
  )
}

// Average distinct active accounts per day of the window, from the first day with activity.
function dauOf(
  activity: ActivityInput[],
  from: string,
  to: string,
  since: string | null
) {
  const { first, last } = daysOf(from, to)
  const start = since && since > first ? since : first
  if (!since || start > last) return null
  const perDay = new Map<string, Set<string>>()
  for (const a of activity)
    if (a.day >= start && a.day <= last)
      perDay.set(a.day, (perDay.get(a.day) ?? new Set()).add(a.userId))
  let days = 0
  let sum = 0
  for (let day = start; day <= last; day = addDays(day, 1)) {
    days++
    sum += perDay.get(day)?.size ?? 0
  }
  return Math.round(sum / days)
}

/** The admin Users tab: sign-ups, active accounts, devices and languages. */
export function buildUsersReport(input: {
  period: Period
  users: UserInput[]
  activity: ActivityInput[]
  activeSince: string | null
  current: Buckets
  compare: Buckets
}): UsersReport {
  const { period, users, activity, activeSince, current, compare } = input
  const { from, to, compareFrom, compareTo } = period
  const length = current.starts.length
  const joined = (a: string, b: string) =>
    users.filter((u) => within(u.createdAt, a, b))
  const signups = joined(from, to)
  const { first, last } = daysOf(from, to)
  const inPeriod = activity.filter((a) => a.day >= first && a.day <= last)
  const activeIds = new Set(inPeriod.map((a) => a.userId))
  const seriesOf = (b: Buckets, a: string, z: string) => {
    const counts = alignTo(
      sumTimed(
        b,
        joined(a, z).map((u) => [u.createdAt, 1])
      ),
      length
    )
    const active = activeOf(activity, b, length)
    return alignStarts(b.starts, length).map((date, i) => ({
      date,
      signups: counts[i] ?? 0,
      active: active[i] ?? null,
    }))
  }
  const upTo = (days: number) =>
    distinct(
      activity.filter((a) => a.day > addDays(last, -days) && a.day <= last)
    )
  return {
    period,
    accounts: users.length,
    signups: {
      count: signups.length,
      previous: joined(compareFrom, compareTo).length,
    },
    dau: {
      value: dauOf(activity, from, to, activeSince),
      previous: dauOf(activity, compareFrom, compareTo, activeSince),
    },
    wau: upTo(7),
    mau: upTo(30),
    activeSince,
    series: seriesOf(current, from, to),
    previousSeries: seriesOf(compare, compareFrom, compareTo),
    byRole: roleSchema.options
      .filter((role) => role !== "admin")
      .map((key) => ({
        key,
        count: signups.filter((u) => u.role === key).length,
      })),
    byMethod: signupMethodSchema.options.map((key) => ({
      key,
      count: signups.filter((u) => u.method === key).length,
    })),
    devices: deviceSchema.options.map((key) => ({
      key,
      count: distinct(inPeriod.filter((a) => a.device === key)),
    })),
    languages: localeSchema.options.map((key) => {
      const of = users.filter((u) => u.locale === key)
      return {
        key,
        accounts: of.length,
        active: of.filter((u) => activeIds.has(u.id)).length,
      }
    }),
  }
}
