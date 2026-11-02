import type { Role } from "@sayaratak/shared/schemas/fields"

import { type Transaction, transaction } from "~/shared/db/tx"
import { BATCH_SIZE } from "~/shared/jobs/batches"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import { listAnnouncementTargets } from "~/modules/auth/auth.overview.service"
import { getOwnerProfiles } from "~/modules/businesses/businesses.overview.service"
import { queuePushMany } from "~/modules/devices/devices.push.service"

import { isInAudience } from "./notifications.broadcast.service"
import * as q from "./notifications.fanout.queries"
import { toNotificationHref } from "./notifications.mapper"

const ID_PREFIX = "n"

/**
 * One pass of the `broadcast-fanout` job (A10): rings the bells of every queued or sending
 * broadcast, oldest first, a chunk of accounts at a time. Answers how many accounts it reached.
 *
 * A chunk is one transaction: the bells, the push rows, the cursor and the count move together,
 * so a crash repeats the whole chunk and nobody is told twice. The audience is frozen at Send:
 * only accounts created before the broadcast row are reached, whoever signs up later is not.
 */
export async function fanOut(size = BATCH_SIZE) {
  let reached = 0
  for (;;) {
    const chunk = await transaction((tx) => fanOutChunk(tx, size))
    if (chunk === null) return reached
    reached += chunk
  }
}

/** Takes the next chunk of the oldest unfinished broadcast; null when none is left. */
async function fanOutChunk(tx: Transaction, size: number) {
  const broadcast = await q.lockUnfinished(tx)
  if (!broadcast) return null
  const now = clock.now()
  const people = await listAnnouncementTargets(tx, broadcast.roles, {
    after: broadcast.cursor ?? undefined,
    createdBy: broadcast.createdAt,
    size,
  })
  const profiles = await getOwnerProfiles(
    tx,
    people.map((person) => person.id)
  )
  const bells = people
    .filter((person) =>
      isInAudience(person, profiles.get(person.id), broadcast)
    )
    .map((person) => bellFor(person, broadcast, now))
  await q.insertMany(tx, bells)
  await queuePushMany(
    tx,
    bells.map((bell) => pushFor(bell))
  )
  await q.updateProgress(tx, {
    id: broadcast.id,
    cursor: people.at(-1)?.id ?? broadcast.cursor,
    reached: bells.length,
    // A short chunk is the last one; an exact multiple finds an empty one next and finishes there.
    finishedAt: people.length < size ? now : null,
  })
  return bells.length
}

function bellFor(
  person: { id: string; role: Role },
  broadcast: q.BroadcastRow,
  now: Date
) {
  return {
    id: newId(ID_PREFIX),
    userId: person.id,
    type: "broadcast" as const,
    title: broadcast.title,
    body: broadcast.body,
    href: broadcast.href && toNotificationHref(person.role, broadcast.href),
    createdAt: now,
  }
}

function pushFor(bell: ReturnType<typeof bellFor>) {
  return {
    userId: bell.userId,
    type: bell.type,
    notificationId: bell.id,
    href: bell.href ?? undefined,
    title: bell.title,
    body: bell.body,
  }
}
