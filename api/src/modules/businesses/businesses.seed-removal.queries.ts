import { and, eq, inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import {
  dealerships,
  mechanicCities,
  mechanics,
  mechanicSpecializations,
  portfolioItems,
  workshopImages,
  workshops,
  workshopServices,
} from "./businesses.tables"

export async function hideBusinessesByDataset(
  tx: Transaction,
  datasetId: string
) {
  const [d, w, m] = await Promise.all([
    tx
      .update(dealerships)
      .set({ seedHidden: true })
      .where(
        and(
          eq(dealerships.seedDatasetId, datasetId),
          eq(dealerships.seedHidden, false)
        )
      )
      .returning({ id: dealerships.id }),
    tx
      .update(workshops)
      .set({ seedHidden: true })
      .where(
        and(
          eq(workshops.seedDatasetId, datasetId),
          eq(workshops.seedHidden, false)
        )
      )
      .returning({ id: workshops.id }),
    tx
      .update(mechanics)
      .set({ seedHidden: true })
      .where(
        and(
          eq(mechanics.seedDatasetId, datasetId),
          eq(mechanics.seedHidden, false)
        )
      )
      .returning({ id: mechanics.id }),
  ])
  return d.length + w.length + m.length
}

export async function findOwnedDealerships(tx: Transaction, ids: string[]) {
  if (!ids.length) return []
  return tx
    .select({
      id: dealerships.id,
      seedDatasetId: dealerships.seedDatasetId,
      ownerUserId: dealerships.ownerUserId,
      logoUploadId: dealerships.logoUploadId,
      coverUploadId: dealerships.coverUploadId,
    })
    .from(dealerships)
    .where(inArray(dealerships.id, ids))
    .for("update")
}

export async function findOwnedWorkshops(tx: Transaction, ids: string[]) {
  if (!ids.length) return []
  return tx
    .select({
      id: workshops.id,
      seedDatasetId: workshops.seedDatasetId,
      ownerUserId: workshops.ownerUserId,
      logoUploadId: workshops.logoUploadId,
      coverUploadId: workshops.coverUploadId,
    })
    .from(workshops)
    .where(inArray(workshops.id, ids))
    .for("update")
}

export async function findOwnedMechanics(tx: Transaction, ids: string[]) {
  if (!ids.length) return []
  return tx
    .select({
      id: mechanics.id,
      seedDatasetId: mechanics.seedDatasetId,
      ownerUserId: mechanics.ownerUserId,
      photoUploadId: mechanics.photoUploadId,
    })
    .from(mechanics)
    .where(inArray(mechanics.id, ids))
    .for("update")
}

export async function findWorkshopImages(
  tx: Transaction,
  workshopIds: string[]
) {
  if (!workshopIds.length) return []
  return tx
    .select({
      workshopId: workshopImages.workshopId,
      uploadId: workshopImages.uploadId,
    })
    .from(workshopImages)
    .where(inArray(workshopImages.workshopId, workshopIds))
}

export async function findPortfolioItems(
  tx: Transaction,
  mechanicIds: string[]
) {
  if (!mechanicIds.length) return []
  return tx
    .select({
      mechanicId: portfolioItems.mechanicId,
      uploadId: portfolioItems.uploadId,
    })
    .from(portfolioItems)
    .where(inArray(portfolioItems.mechanicId, mechanicIds))
}

export async function deleteDealershipRows(tx: Transaction, ids: string[]) {
  if (!ids.length) return
  await tx.delete(dealerships).where(inArray(dealerships.id, ids))
}

export async function deleteWorkshopRows(tx: Transaction, ids: string[]) {
  if (!ids.length) return
  await tx.delete(workshopImages).where(inArray(workshopImages.workshopId, ids))
  await tx
    .delete(workshopServices)
    .where(inArray(workshopServices.workshopId, ids))
  await tx.delete(workshops).where(inArray(workshops.id, ids))
}

export async function deleteMechanicRows(tx: Transaction, ids: string[]) {
  if (!ids.length) return
  await tx.delete(portfolioItems).where(inArray(portfolioItems.mechanicId, ids))
  await tx.delete(mechanicCities).where(inArray(mechanicCities.mechanicId, ids))
  await tx
    .delete(mechanicSpecializations)
    .where(inArray(mechanicSpecializations.mechanicId, ids))
  await tx.delete(mechanics).where(inArray(mechanics.id, ids))
}
