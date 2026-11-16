import type { Executor } from "~/shared/db/tx"

import * as q from "./listings.seed.queries"

/** Visible preview rows determine site notice state without importing installation. */
export function hasPublicSeedContent(ex: Executor) {
  return q.hasPublicSeedContent(ex)
}
