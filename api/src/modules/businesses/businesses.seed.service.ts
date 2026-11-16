import {
  type SeedBusinessBatch,
  seedBusinessBatchSchema,
} from "@sayaratak/shared/schemas/seed-batches"
import type { SeedBusiness } from "@sayaratak/shared/schemas/seed-manifest"
import { profileStatusSchema } from "@sayaratak/shared/schemas/profile"
import { slugify } from "@sayaratak/shared/lib/slug"

import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import * as auth from "~/modules/auth/auth.seed.service"
import * as taxonomy from "~/modules/taxonomy/taxonomy.service"
import {
  attachSeedImages,
  getSeedUploads,
} from "~/modules/uploads/uploads.seed.service"

import * as q from "./businesses.seed.queries"
import * as write from "./businesses.write.queries"
import {
  insertMechanic,
  insertWorkshop,
} from "./businesses.seed-profiles.service"

export {
  lockBusinessInteraction,
  hasPublicSeedContent,
  isSeedBusiness,
  isPreviewBusiness,
  resolvePublicSeedSeller,
} from "./businesses.visibility.service"

const CLOSED_HOURS = Array.from({ length: 7 }, (_, day) => ({
  day,
  closed: true,
  open: "00:00",
  close: "00:00",
}))

/** Installs fictional profiles before their inventory, with no claims or contact. */
export async function insertSeedBusinesses(
  tx: Transaction,
  input: SeedBusinessBatch
) {
  const batch = seedBusinessBatchSchema.parse(input)
  const ids: string[] = []
  const sorted = [...batch.records].sort((a, b) => a.id.localeCompare(b.id))
  for (const record of sorted) {
    await installSeedBusiness(tx, record, batch)
    ids.push(record.id)
  }
  return ids
}

async function installSeedBusiness(
  tx: Transaction,
  record: SeedBusiness,
  batch: SeedBusinessBatch
) {
  const slug = `${slugify(record.name.en)}-${record.id}`
  await validateBusinessRecord(tx, { record, batch, slug })
  const bindings = getSortedBindings(batch, record.id)
  const [first, second] = bindings.map((binding) => binding.uploadId)
  if (!first || !second) fail.conflict()
  await insertBusinessKind(tx, { record, batch, slug, first, second })
  await verifyAndAttachUploads(tx, {
    datasetId: batch.datasetId,
    ownerUserId: record.ownerId,
    bindings,
  })
}

async function validateBusinessRecord(
  tx: Transaction,
  input: {
    record: SeedBusiness
    batch: SeedBusinessBatch
    slug: string
  }
) {
  const { record, batch, slug } = input
  if (
    !(await auth.isSeedOwner(tx, {
      id: record.ownerId,
      datasetId: batch.datasetId,
    }))
  )
    fail.conflict()
  if (await q.lockSeedBusiness(tx, record.id)) fail.conflict()
  if (!(await taxonomy.isCity(tx, record.cityId))) fail.conflict()
  if (await write.hasSlug(tx, { kind: record.kind, slug })) fail.conflict()
}

function getSortedBindings(batch: SeedBusinessBatch, recordId: string) {
  const bindings = batch.bindings
    .filter((binding) => binding.recordId === recordId)
    .sort((a, b) => a.position - b.position)
  if (
    bindings.length !== 2 ||
    bindings[0]?.position !== 0 ||
    bindings[1]?.position !== 1
  ) {
    fail.conflict()
  }
  return bindings
}

async function insertBusinessKind(
  tx: Transaction,
  input: {
    record: SeedBusiness
    batch: SeedBusinessBatch
    slug: string
    first: string
    second: string
  }
) {
  const { record, batch, slug, first, second } = input
  const base = {
    id: record.id,
    slug,
    ownerUserId: record.ownerId,
    name: record.name,
    cityId: record.cityId,
    whatsapp: null,
    verified: false,
    status: profileStatusSchema.enum.active,
    seedDatasetId: batch.datasetId,
    seedHidden: false,
    createdAt: new Date(batch.anchor),
  }
  const place = {
    address: "",
    description: record.description,
    hours: CLOSED_HOURS,
    logoUploadId: first,
    coverUploadId: second,
  }
  if (record.kind === "dealership")
    await write.insertDealership(tx, { ...base, ...place, phones: [] })
  if (record.kind === "workshop")
    await insertWorkshop(tx, { record, base: { ...base, ...place, phone: "" } })
  if (record.kind === "mechanic")
    await insertMechanic(tx, { batch, record, base, first, second })
}

async function verifyAndAttachUploads(
  tx: Transaction,
  input: {
    datasetId: string
    ownerUserId: string
    bindings: SeedBusinessBatch["bindings"]
  }
) {
  const { datasetId, ownerUserId, bindings } = input
  const uploadIds = bindings.map((binding) => binding.uploadId)
  const uploads = await getSeedUploads(tx, { datasetId, ids: uploadIds })
  if (
    bindings.some(
      (binding) =>
        !uploads.some(
          (upload) =>
            upload.id === binding.uploadId &&
            upload.cloudinaryId === binding.providerId
        )
    )
  )
    fail.conflict()
  await attachSeedImages(tx, { datasetId, ownerUserId, ids: uploadIds })
}
