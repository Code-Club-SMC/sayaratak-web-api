import type { reportInputSchema } from "@sayaratak/shared/schemas/inputs"
import type { z } from "zod"

import { db } from "~/shared/db/client"
import type { Executor } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as listings from "~/modules/listings/listings.stats.service"

import { toReport } from "./reports.mapper"
import * as q from "./reports.queries"

const ID_PREFIX = "rp"

/** Reports waiting in the admin queue. */
export function countOpenReports(ex: Executor) {
  return q.countOpen(ex)
}

/**
 * `POST /reports`: a signed-in person tells the admin a listing breaks the
 * rules. 404 for an unknown listing; "other" needs details. Any listing can
 * be reported, whatever its state, as in the mock.
 */
export async function createReport(
  user: SessionUser,
  input: z.output<typeof reportInputSchema>
) {
  if (!(await listings.hasListing(db, input.listingId))) fail.notFound()
  if (input.reason === "other" && !input.details)
    fail.validation({ details: "validation.details_required" })
  const saved = await q.insert(db, {
    id: newId(ID_PREFIX),
    listingId: input.listingId,
    reporterId: user.id,
    reason: input.reason,
    details: input.details,
    createdAt: clock.now(),
  })
  return toReport(saved)
}
