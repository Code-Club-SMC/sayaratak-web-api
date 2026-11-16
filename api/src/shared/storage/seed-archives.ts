import { env } from "~/env"
import { ApiError, fail } from "~/shared/http/errors"
import { z } from "zod"

import { privateObjects } from "./private-objects"

const ARCHIVE_MAX_BYTES = 25 * 1024 * 1024
const KEY_PATTERN =
  /^admin-seed\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.zip$/
const testObjects = new Map<string, Uint8Array<ArrayBuffer>>()
const missingObjectSchema = z.object({
  code: z.enum(["NoSuchKey", "NotFound"]),
})

export function isSeedArchiveSourceMissing(error: unknown) {
  if (error instanceof ApiError)
    return error.fields?.archive === "validation.seed_archive_source_expired"
  return missingObjectSchema.safeParse(error).success
}

export function seedArchiveKey(input: {
  datasetId: string
  operationId: string
  digest: string
}) {
  const key = `admin-seed/${input.datasetId}/${input.operationId}/${input.digest}.zip`
  checkKey(key)
  return key
}

/** Archives have no development-disk fallback and never expose download URLs. */
export const seedArchives = {
  async put(
    key: string,
    source: ReadableStream<Uint8Array>,
    signal?: AbortSignal
  ) {
    checkKey(key)
    if (env.NODE_ENV === "test") {
      if (env.APP_ENV !== "test") fail.forbidden()
      const bytes = await collectArchive(source)
      testObjects.set(key, bytes)
      return bytes.byteLength
    }
    return transport().put(key, source, signal)
  },
  async download(key: string): Promise<Uint8Array<ArrayBuffer>> {
    checkKey(key)
    if (env.NODE_ENV === "test") {
      if (env.APP_ENV !== "test") fail.forbidden()
      const bytes = testObjects.get(key)
      if (!bytes)
        throw new ApiError("not_found", {
          archive: "validation.seed_archive_source_expired",
        })
      return bytes.slice()
    }
    try {
      return await collectArchive(transport().read(key))
    } catch (error) {
      // R2 identifies object absence with these codes, not with every transport failure.
      if (isSeedArchiveSourceMissing(error))
        throw new ApiError("not_found", {
          archive: "validation.seed_archive_source_expired",
        })
      throw error
    }
  },
  async remove(key: string) {
    checkKey(key)
    if (env.NODE_ENV === "test") {
      if (env.APP_ENV !== "test") fail.forbidden()
      testObjects.delete(key)
      return
    }
    await transport().remove(key)
  },
}

function transport() {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET
  )
    fail.forbidden()
  return privateObjects({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
  })
}

function checkKey(key: string) {
  if (!KEY_PATTERN.test(key))
    fail.validation({ archive: "validation.seed_archive_key" })
}

async function collectArchive(source: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const chunk of source) {
    length += chunk.byteLength
    if (length > ARCHIVE_MAX_BYTES)
      fail.validation({ archive: "validation.too_long" })
    chunks.push(chunk)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}
