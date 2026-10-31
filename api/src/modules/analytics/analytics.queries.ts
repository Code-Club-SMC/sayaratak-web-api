import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { events } from "./analytics.tables"

export function deleteOfTarget(ex: Executor, targetId: string) {
  return ex.delete(events).where(eq(events.targetId, targetId))
}
