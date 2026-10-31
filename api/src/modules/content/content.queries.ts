import type { Executor } from "~/shared/db/tx"

import { settings } from "./content.tables"

export function getSettings(ex: Executor) {
  return ex
    .select()
    .from(settings)
    .limit(1)
    .then((rows) => rows[0] ?? null)
}
