import { db } from "~/shared/db/client"
import { drain } from "~/shared/jobs/batches"
import { clock } from "~/shared/time/clock"

import * as accounts from "./auth.accounts.queries"

const UNFINISHED_HOURS = 24
const HOUR_MS = 3_600_000

/**
 * Deletes the sign-ups that never entered their emailed code within a day (A10, A6), so the
 * address is free again. Such an account cannot sign in, so it owns nothing. Answers how many
 * it deleted.
 */
export function deleteUnfinishedSignUps(size?: number) {
  const before = new Date(clock.now().getTime() - UNFINISHED_HOURS * HOUR_MS)
  return drain(
    (limit) => accounts.deleteUnfinishedSignUps(db, { before, size: limit }),
    size
  )
}
