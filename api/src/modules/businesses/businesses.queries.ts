import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { dealerships, mechanics, workshops } from "./businesses.tables"

/** The id of the one business profile the user owns, of any kind. */
export async function getIdOfOwner(ex: Executor, ownerUserId: string) {
  // One account has one business, so at most one of the three answers.
  const found = await Promise.all(
    [dealerships, workshops, mechanics].map((table) =>
      ex
        .select({ id: table.id })
        .from(table)
        .where(eq(table.ownerUserId, ownerUserId))
        .then(([row]) => row?.id)
    )
  )
  return found.find(Boolean)
}
