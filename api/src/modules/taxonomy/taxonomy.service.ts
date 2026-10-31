import type { Executor } from "~/shared/db/tx"

import * as q from "./taxonomy.queries"

/** The city exists in the taxonomy. */
export function isCity(ex: Executor, id: string) {
  return q.hasCity(ex, id)
}
