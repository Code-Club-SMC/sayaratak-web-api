import type { InteractionMode } from "@sayaratak/shared/schemas/interaction"

import type { Executor } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import { getOwnerOf } from "./businesses.queries"
import * as q from "./businesses.seed.queries"

/** Locks a business before creating user-owned activity or changing its owner. */
export async function lockBusinessInteraction(
  ex: Executor,
  id: string
): Promise<InteractionMode> {
  const row = await q.lockSeedBusiness(ex, id)
  if (!row) fail.notFound()
  return row.seedDatasetId ? "preview" : "live"
}

/** Visible profiles keep the public demo notice active even without inventory. */
export function hasPublicSeedContent(ex: Executor) {
  return q.hasPublicSeedContent(ex)
}

/** Checks exact ownership before skipping an already committed profile. */
export async function isSeedBusiness(
  ex: Executor,
  ref: { id: string; datasetId: string }
) {
  return (await q.lockSeedBusiness(ex, ref.id))?.seedDatasetId === ref.datasetId
}

/** Ignores analytics for synthetic profiles while preserving unknown-target behavior. */
export async function isPreviewBusiness(ex: Executor, id: string) {
  return Boolean((await q.lockSeedBusiness(ex, id))?.seedDatasetId)
}

/** Resolves a preview's public profile ID without sending its synthetic account ID. */
export async function resolvePublicSeedSeller(
  ex: Executor,
  id: string | undefined
) {
  if (!id || !(await isPreviewBusiness(ex, id))) return undefined
  return (await getOwnerOf(ex, id))?.ownerUserId
}
