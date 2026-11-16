import type { SeedArchiveRejection } from "@sayaratak/shared/schemas/admin-seed"

import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"

import * as q from "./admin-seed.archive.queries"
import { archiveCheckpointSchema } from "./admin-seed.archive.types"
import type { SeedOperationRow } from "./admin-seed.operations.queries"

/** Reports only the asset whose bytes failed, without touching accepted generations. */
export async function rejectSeedArchiveEntry(
  operation: SeedOperationRow,
  rejection: SeedArchiveRejection
) {
  await transaction(async (tx) => {
    const dataset = await q.lockArchiveDataset(tx)
    const current = await q.lockArchiveOperation(tx, operation.id)
    if (!dataset || dataset.id !== operation.datasetId || !current)
      fail.conflict()
    if (current.supersededBy || !["queued", "running"].includes(current.state))
      fail.conflict()
    const checkpoint = archiveCheckpointSchema.parse(current.checkpoint)
    if (
      checkpoint.rejections.some((item) => item.assetId === rejection.assetId)
    )
      return
    const assets = await q.listArchiveAssets(tx, operation.datasetId)
    const previous = assets.filter((item) => item.assetId === rejection.assetId)
    await q.insertRejectedArchiveAsset(tx, {
      datasetId: operation.datasetId,
      assetId: rejection.assetId,
      generation: Math.max(0, ...previous.map((item) => item.generation)) + 1,
      filename: rejection.filename,
      operationId: operation.id,
      state: "rejected",
      accepted: false,
      createdAt: clock.now(),
    })
    await q.updateArchiveOperation(tx, {
      id: operation.id,
      changes: {
        checkpoint: {
          ...checkpoint,
          rejections: [...checkpoint.rejections, rejection],
        },
        updatedAt: clock.now(),
      },
    })
  })
}

/** Returns only known manifest asset IDs, filenames and allowlisted reasons for admin output. */
export function getSeedArchiveRejections(checkpoint: Record<string, unknown>) {
  const parsed = archiveCheckpointSchema.safeParse(checkpoint)
  return parsed.success ? parsed.data.rejections : []
}
