import type {
  SeedRemovalResult,
  SeedRemovalScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import * as q from "./businesses.seed-removal.queries"

export function hideSeedRecords(
  tx: Transaction,
  datasetId: string
): Promise<number> {
  return q.hideBusinessesByDataset(tx, datasetId)
}

export async function getBusinessDependents(
  tx: Transaction,
  businessIds: string[]
) {
  if (!businessIds.length) return []
  const [dealers, workshops, mechanics, wImages, mItems] = await Promise.all([
    q.findOwnedDealerships(tx, businessIds),
    q.findOwnedWorkshops(tx, businessIds),
    q.findOwnedMechanics(tx, businessIds),
    q.findWorkshopImages(tx, businessIds),
    q.findPortfolioItems(tx, businessIds),
  ])
  const result: Array<{
    id: string
    ownerUserId: string | null
    uploadIds: string[]
  }> = []
  for (const d of dealers) {
    const uploads = [d.logoUploadId, d.coverUploadId].filter(
      (id): id is string => Boolean(id)
    )
    result.push({ id: d.id, ownerUserId: d.ownerUserId, uploadIds: uploads })
  }
  for (const w of workshops) {
    const images = wImages
      .filter((img) => img.workshopId === w.id)
      .map((img) => img.uploadId)
    const uploads = [w.logoUploadId, w.coverUploadId, ...images].filter(
      (id): id is string => Boolean(id)
    )
    result.push({ id: w.id, ownerUserId: w.ownerUserId, uploadIds: uploads })
  }
  for (const m of mechanics) {
    const portfolio = mItems
      .filter((item) => item.mechanicId === m.id)
      .map((item) => item.uploadId)
    const uploads = [m.photoUploadId, ...portfolio].filter((id): id is string =>
      Boolean(id)
    )
    result.push({ id: m.id, ownerUserId: m.ownerUserId, uploadIds: uploads })
  }
  return result
}

type BusinessEntry = {
  id: string
  seedDatasetId: string | null
  kind: "d" | "w" | "m"
}

function buildBusinessRowMap(
  dealers: Array<{ id: string; seedDatasetId: string | null }>,
  workshops: Array<{ id: string; seedDatasetId: string | null }>,
  mechanics: Array<{ id: string; seedDatasetId: string | null }>
) {
  const map = new Map<string, BusinessEntry>()
  for (const d of dealers)
    map.set(d.id, { id: d.id, seedDatasetId: d.seedDatasetId, kind: "d" })
  for (const w of workshops)
    map.set(w.id, { id: w.id, seedDatasetId: w.seedDatasetId, kind: "w" })
  for (const m of mechanics)
    map.set(m.id, { id: m.id, seedDatasetId: m.seedDatasetId, kind: "m" })
  return map
}

function classifyBusiness(
  row: BusinessEntry | undefined,
  datasetId: string,
  isProtected: boolean
) {
  if (!row) return "missing"
  if (row.seedDatasetId !== datasetId) fail.conflict()
  if (isProtected) return "retained"
  return row.kind
}

function partitionRemovals(
  scope: SeedRemovalScope,
  map: Map<string, BusinessEntry>
) {
  const protectedSet = new Set(scope.orderedProtectedIds)
  const dDelete: string[] = []
  const wDelete: string[] = []
  const mDelete: string[] = []
  const missing: string[] = []
  const retained: Array<{ id: string; reason: string }> = []
  for (const id of scope.orderedOwnedIds) {
    const kind = classifyBusiness(
      map.get(id),
      scope.datasetId,
      protectedSet.has(id)
    )
    if (kind === "missing") missing.push(id)
    else if (kind === "retained")
      retained.push({ id, reason: "has_real_references" })
    else if (kind === "d") dDelete.push(id)
    else if (kind === "w") wDelete.push(id)
    else mDelete.push(id)
  }
  return { dDelete, wDelete, mDelete, missing, retained }
}

export async function removeSeedRecords(
  tx: Transaction,
  scope: SeedRemovalScope
): Promise<SeedRemovalResult> {
  const [dealers, workshops, mechanics] = await Promise.all([
    q.findOwnedDealerships(tx, scope.orderedOwnedIds),
    q.findOwnedWorkshops(tx, scope.orderedOwnedIds),
    q.findOwnedMechanics(tx, scope.orderedOwnedIds),
  ])
  const map = buildBusinessRowMap(dealers, workshops, mechanics)
  const part = partitionRemovals(scope, map)
  await Promise.all([
    q.deleteDealershipRows(tx, part.dDelete),
    q.deleteWorkshopRows(tx, part.wDelete),
    q.deleteMechanicRows(tx, part.mDelete),
  ])
  return {
    domain: "business",
    deletedIds: [...part.dDelete, ...part.wDelete, ...part.mDelete],
    alreadyMissingIds: part.missing,
    retained: part.retained,
  }
}
