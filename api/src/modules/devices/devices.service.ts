import type { deviceInputSchema } from "@sayaratak/shared/schemas/inputs"
import type { z } from "zod"

import { db } from "~/shared/db/client"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"

import * as q from "./devices.queries"

const ID_PREFIX = "dev"

/** `POST /me/devices`: registers the app's push address, or moves it to this account and refreshes it. */
export async function registerDevice(
  user: SessionUser,
  input: z.infer<typeof deviceInputSchema>
) {
  const now = clock.now()
  await q.upsert(db, {
    ...input,
    id: newId(ID_PREFIX),
    userId: user.id,
    lastSeenAt: now,
    createdAt: now,
  })
}

/** `DELETE /me/devices/:fcmToken`, on sign-out: forgets the account's own device; any other token changes nothing. */
export async function removeDevice(user: SessionUser, fcmToken: string) {
  await q.removeOf(db, { userId: user.id, fcmToken })
}
