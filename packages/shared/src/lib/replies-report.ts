import type { Bilingual } from "../schemas/fields"
import type { Period } from "../schemas/period"
import type { RepliesReport } from "../schemas/reports-replies"
import { median } from "./listings-report"
import { within } from "./period"

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const UNANSWERED_SHOWN = 10

// One thread of the account with its messages oldest first; `mine` marks the account's own (step 11.7-r6).
export type ThreadInput = {
  id: string
  subjectTitle: Bilingual
  messages: { mine: boolean; createdAt: string }[]
}

type Started = { at: number; reply: number | null }

// Threads a buyer started inside [from, to): when, and when the account first answered.
function startedIn(threads: ThreadInput[], from: string, to: string) {
  return threads.flatMap((t): Started[] => {
    const [first] = t.messages
    if (!first || first.mine || !within(first.createdAt, from, to)) return []
    const reply = t.messages.find((m) => m.mine)
    return [
      {
        at: Date.parse(first.createdAt),
        reply: reply ? Date.parse(reply.createdAt) : null,
      },
    ]
  })
}

function statsOf(started: Started[], now: number) {
  const waits = started.flatMap((s) =>
    s.reply === null ? [] : [s.reply - s.at]
  )
  const m = median(waits)
  // A thread younger than 24 h without a reply has not missed the 24 h yet, so it is left out of the rate.
  const decided = started.filter(
    (s) => s.reply !== null || now - s.at >= DAY_MS
  )
  const fast = decided.filter(
    (s) => s.reply !== null && s.reply - s.at <= DAY_MS
  )
  return {
    threads: started.length,
    medianMinutes: m === null ? null : Math.round(m / MINUTE_MS),
    replyRate: decided.length
      ? Math.round((fast.length / decided.length) * 100)
      : null,
  }
}

const speedOf = (s: Started) => {
  if (s.reply === null) return "none"
  const hours = (s.reply - s.at) / 3_600_000
  return hours <= 1 ? "h1" : hours <= 4 ? "h4" : hours <= 24 ? "h24" : "later"
}

/** The Responsiveness report of one account from its threads, at `now`. */
export function buildRepliesReport(input: {
  period: Period
  threads: ThreadInput[]
  now: number
}): RepliesReport {
  const { period, threads, now } = input
  const current = startedIn(threads, period.from, period.to)
  const before = startedIn(threads, period.compareFrom, period.compareTo)
  const speed = (["h1", "h4", "h24", "later", "none"] as const).map((key) => ({
    key,
    count: current.filter((s) => speedOf(s) === key).length,
  }))
  const waiting = threads.flatMap((t) => {
    let lastMine = -1
    t.messages.forEach((m, i) => {
      if (m.mine) lastMine = i
    })
    const next = t.messages[lastMine + 1]
    return next
      ? [
          {
            threadId: t.id,
            subjectTitle: t.subjectTitle,
            waitingSince: next.createdAt,
          },
        ]
      : []
  })
  waiting.sort(
    (a, b) =>
      Date.parse(a.waitingSince) - Date.parse(b.waitingSince) ||
      (a.threadId < b.threadId ? -1 : 1)
  )
  return {
    period,
    summary: statsOf(current, now),
    previous: statsOf(before, now),
    speed,
    unanswered: {
      count: waiting.length,
      items: waiting.slice(0, UNANSWERED_SHOWN),
    },
  }
}
