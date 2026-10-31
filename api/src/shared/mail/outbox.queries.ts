import { eq, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type NewOutboxRow, outbox } from "./outbox.tables"

export function insertOutbox(ex: Executor, row: NewOutboxRow) {
  return ex
    .insert(outbox)
    .values(row)
    .returning()
    .then(([inserted]) => inserted)
}

/** Sent: the code is dropped from the row (A9). */
export function updateOutboxSent(ex: Executor, id: string, at: Date) {
  return ex
    .update(outbox)
    .set({ sentAt: at, payload: {}, lastError: null })
    .where(eq(outbox.id, id))
}

/** Failed: one more attempt counted, retried by the outbox job after `sendAfter`. */
export function updateOutboxFailed(
  ex: Executor,
  id: string,
  failure: { error: string; sendAfter: Date }
) {
  return ex
    .update(outbox)
    .set({
      attempts: sql`${outbox.attempts} + 1`,
      lastError: failure.error,
      sendAfter: failure.sendAfter,
    })
    .where(eq(outbox.id, id))
}
