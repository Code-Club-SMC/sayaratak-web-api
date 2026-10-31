import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { verificationRequests } from "./verification.tables"

export function countPending(ex: Executor) {
  return ex.$count(
    verificationRequests,
    eq(verificationRequests.status, "pending")
  )
}
