import { db } from "~/shared/db/client"
import { drain } from "~/shared/jobs/batches"
import { MAX_ATTEMPTS } from "~/shared/mail/backoff"
import * as outbox from "~/shared/mail/outbox.queries"
import { deliver } from "~/shared/mail/send"
import { clock } from "~/shared/time/clock"
import { deliverPush } from "~/modules/devices/devices.push.service"

// How long an emailed code works (OTP_SECONDS in auth.config, CODE_SECONDS in platform-admin).
const CODE_MINUTES = 10
// A new row is sent by the request that wrote it. The job takes it after this, in case that
// request died between the insert and the send.
const FIRST_TRY_GRACE_MINUTES = 2
const MINUTE_MS = 60_000

/**
 * One pass of the outbox job (A10): empties the codes of mails too old to be useful, then sends
 * every email and push whose turn has come (the first try failed, or the request that wrote it
 * died). A failed row waits 1, 2, 4, 8 minutes and is then given up. Answers how many rows it
 * cleared or sent.
 *
 * ponytail: one row at a time, so a slow SMTP server slows the pass; send in small parallel
 * groups if a backlog ever outlasts the minute.
 */
export async function sendDue(size?: number) {
  const now = clock.now()
  const cleared = await drain(
    (limit) =>
      outbox.updateCodesCleared(db, {
        before: minutesBefore(now, CODE_MINUTES),
        size: limit,
        maxAttempts: MAX_ATTEMPTS,
      }),
    size
  )
  const sent = await drain(async (limit) => {
    const rows = await outbox.listDue(db, {
      now,
      size: limit,
      maxAttempts: MAX_ATTEMPTS,
      firstTryBefore: minutesBefore(now, FIRST_TRY_GRACE_MINUTES),
    })
    for (const row of rows) {
      await (row.channel === "push" ? deliverPush(row) : deliver(row))
    }
    return rows.length
  }, size)
  return cleared + sent
}

function minutesBefore(at: Date, minutes: number) {
  return new Date(at.getTime() - minutes * MINUTE_MS)
}
