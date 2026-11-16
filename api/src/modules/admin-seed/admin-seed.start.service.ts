import type { SeedOperation } from "@sayaratak/shared/schemas/admin-seed"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { type Transaction, transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import { recordAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"

import { freezeInstallBindings } from "./admin-seed.install-state.service"
import { getSeedCapability } from "./admin-seed.capability.service"
import * as q from "./admin-seed.install.queries"
import { toSeedOperation } from "./admin-seed.mapper"
import { getActiveOperation } from "./admin-seed.operations.queries"
import { getLiveDataset } from "./admin-seed.queries"
import { checkSeedTaxonomy } from "./admin-seed.taxonomy.service"

/** Queues one immutable install, or returns the equivalent durable operation. */
export async function startSeedInstall(
  actor: Actor,
  manifestDigest: string
): Promise<SeedOperation> {
  if (!getSeedCapability(env).enabled) fail.forbidden()
  const current = await getLiveDataset(db)
  if (!current) fail.notFound()
  return transaction(async (tx) => {
    const dataset = await q.lockInstallDataset(tx, current.id)
    if (!dataset || dataset.manifestDigest !== manifestDigest) fail.conflict()
    const existing = await findActiveSeed(tx, dataset.id)
    if (existing) return existing
    if (dataset.state !== "ready" && dataset.state !== "preparing")
      fail.conflict()
    const bindings = await freezeInstallBindings(tx, dataset)
    await checkSeedTaxonomy(tx, dataset.manifest)
    const now = clock.now()
    const operation = await q.insertInstallOperation(tx, {
      id: newId("so"),
      datasetId: dataset.id,
      kind: "seed",
      state: "queued",
      stage: "insert-businesses",
      actorId: actor.admin.id,
      actorIp: actor.ip,
      total: 230,
      checkpoint: { bindings, ownersInstalled: false },
      committedImages: bindings.length,
      createdAt: now,
      updatedAt: now,
    })
    if (!operation) fail.conflict()
    await q.updateInstallDataset(tx, {
      id: dataset.id,
      state: "seeding",
      at: now,
    })
    await recordAudit(tx, actor, {
      action: "seed.start",
      targetType: "seed",
      targetId: dataset.id,
      after: { manifestDigest },
    })
    return toSeedOperation(operation)
  })
}

async function findActiveSeed(tx: Transaction, datasetId: string) {
  const active = await getActiveOperation(tx, datasetId)
  if (!active) return undefined
  const locked = await q.lockInstallOperation(tx, active.id)
  if (locked?.kind !== "seed" || locked.supersededBy) fail.conflict()
  return toSeedOperation(locked)
}
