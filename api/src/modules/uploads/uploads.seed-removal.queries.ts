import { and, count, eq, inArray, like, ne } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { fileDeletions, uploads } from "./uploads.tables"

export async function findOwnedSeedUploads(
  ex: Executor,
  input: { datasetId: string; ids: string[] }
) {
  if (!input.ids.length) return []
  return ex
    .select({
      id: uploads.id,
      seedDatasetId: uploads.seedDatasetId,
      cloudinaryId: uploads.cloudinaryId,
      mime: uploads.mime,
    })
    .from(uploads)
    .where(
      and(
        eq(uploads.seedDatasetId, input.datasetId),
        inArray(uploads.id, input.ids)
      )
    )
    .for("update")
}

export async function listDatasetUploads(ex: Executor, datasetId: string) {
  return ex
    .select({
      id: uploads.id,
      cloudinaryId: uploads.cloudinaryId,
      mime: uploads.mime,
    })
    .from(uploads)
    .where(eq(uploads.seedDatasetId, datasetId))
}

export async function countCloudinaryIdReferences(
  ex: Executor,
  cloudinaryId: string,
  excludeUploadId: string
) {
  const [row] = await ex
    .select({ count: count() })
    .from(uploads)
    .where(
      and(
        eq(uploads.cloudinaryId, cloudinaryId),
        ne(uploads.id, excludeUploadId)
      )
    )
  return row?.count ?? 0
}

export async function deleteUploadRows(ex: Executor, ids: string[]) {
  if (!ids.length) return
  await ex.delete(uploads).where(inArray(uploads.id, ids))
}

export async function countDatasetDeletions(ex: Executor, keyPrefix: string) {
  const rows = await ex
    .select({ attempts: fileDeletions.attempts })
    .from(fileDeletions)
    .where(like(fileDeletions.publicId, `${keyPrefix}%`))
  let pending = 0
  let failed = 0
  for (const row of rows) {
    if (row.attempts >= 20) failed += 1
    else pending += 1
  }
  return { pending, failed }
}

export async function countRemainingSeedUploads(
  ex: Executor,
  datasetId: string
) {
  const [row] = await ex
    .select({ count: count() })
    .from(uploads)
    .where(eq(uploads.seedDatasetId, datasetId))
  return row?.count ?? 0
}
