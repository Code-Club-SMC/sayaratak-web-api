import type { Executor } from "~/shared/db/tx"

import * as q from "./businesses.queries"

/** The id of the dealership, workshop or mechanic profile the user owns, if any. */
export function getBusinessIdOf(ex: Executor, ownerUserId: string) {
  return q.getIdOfOwner(ex, ownerUserId)
}
