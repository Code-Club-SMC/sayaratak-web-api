import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { reviews } from "./reviews.tables"

export function deleteOfTarget(ex: Executor, targetId: string) {
  return ex.delete(reviews).where(eq(reviews.targetId, targetId))
}

export function countFlagged(ex: Executor) {
  return ex.$count(reviews, eq(reviews.status, "flagged"))
}
