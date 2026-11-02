import type { BroadcastAudience } from "@sayaratak/shared/schemas/api"
import type { broadcastInputSchema } from "@sayaratak/shared/schemas/inputs"
import type { z } from "zod"

import type { Executor, Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { pageParams } from "~/shared/http/page"
import { newId } from "~/shared/text/ids"
import { containing } from "~/shared/text/like"
import { clock } from "~/shared/time/clock"
import { recordAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"
import { listAnnouncementTargets } from "~/modules/auth/auth.overview.service"
import { getOwnerProfiles } from "~/modules/businesses/businesses.overview.service"
import { isCity } from "~/modules/taxonomy/taxonomy.service"

import { toBroadcast } from "./notifications.mapper"
import * as q from "./notifications.broadcast.queries"
import { notify } from "./notifications.service"

const ID_PREFIX = "bc"
const PAGE_SIZE = { default: 20, max: 100 }

type BroadcastInput = z.output<typeof broadcastInputSchema>
/** Raw query values of `GET /admin/broadcasts`. */
export type BroadcastsQuery = Partial<
  Record<"q" | "page" | "pageSize" | "limit", string>
>

/** One page of sent announcements, newest first; `q` keeps those whose title holds it in either language. */
export async function listBroadcasts(ex: Executor, query: BroadcastsQuery) {
  const { page, pageSize: size } = pageParams(query, PAGE_SIZE)
  const term = query.q?.trim().toLowerCase()
  const found = await q.listBroadcasts(ex, {
    pattern: term ? containing(term) : undefined,
    page: { offset: (page - 1) * size, size },
  })
  return {
    items: found.rows.map(toBroadcast),
    total: found.total,
    page,
    pageSize: size,
  }
}

/** How many accounts an announcement to this audience reaches: the bells that will ring. */
export async function countAudience(ex: Executor, audience: BroadcastAudience) {
  return (await listAudience(ex, audience)).length
}

/**
 * Sends an announcement to every account in the audience, in one transaction, and keeps it in the
 * history with the number reached. 422 on `cityId` for a city that does not exist.
 */
export async function sendBroadcast(
  tx: Transaction,
  actor: Actor,
  input: BroadcastInput
) {
  if (input.cityId && !(await isCity(tx, input.cityId)))
    fail.validation({ cityId: "validation.required" })
  const audience = await listAudience(tx, input)
  for (const userId of audience)
    await notify(tx, {
      userId,
      type: "broadcast",
      title: input.title,
      body: input.body,
      href: input.href,
    })
  const saved = await q.insertBroadcast(tx, {
    id: newId(ID_PREFIX),
    title: input.title,
    body: input.body,
    href: input.href,
    roles: input.roles,
    cityId: input.cityId || null,
    verifiedOnly: input.verifiedOnly,
    recipients: audience.length,
    sentBy: actor.admin.id,
    createdAt: clock.now(),
  })
  if (!saved) throw new Error("broadcast vanished after insert")
  const sent = toBroadcast(saved)
  await recordAudit(tx, actor, {
    action: "broadcast.send",
    targetType: "broadcast",
    targetId: saved.id,
    after: sent,
  })
  return sent
}

/**
 * The ids of the accounts an audience reaches: those in the roles who read announcements, then
 * narrowed by city and the verified badge. An individual has no business, so the city is their
 * own and "verified only" leaves individuals out; a business uses its profile's city.
 */
async function listAudience(ex: Executor, audience: BroadcastAudience) {
  // Two independent reads.
  const [people, profiles] = await Promise.all([
    listAnnouncementTargets(ex, audience.roles),
    getOwnerProfiles(ex),
  ])
  return people
    .filter((person) => {
      const profile = profiles.get(person.id)
      if (audience.verifiedOnly && !profile?.verified) return false
      return (
        !audience.cityId ||
        (profile?.cityId ?? person.cityId) === audience.cityId
      )
    })
    .map((person) => person.id)
}
