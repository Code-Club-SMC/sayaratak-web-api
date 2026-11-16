import type { SeedArchiveInput } from "@sayaratak/shared/schemas/admin-seed"

import { ApiError, fail } from "~/shared/http/errors"
import { seedArchives } from "~/shared/storage/seed-archives"
import { clock } from "~/shared/time/clock"

const INTAKE_TIMEOUT_MS = 120_000
const ARCHIVE_MAX_BYTES = 25 * 1024 * 1024

/** Counts and hashes actual chunks before forwarding each bounded chunk to private R2. */
export async function streamSeedArchive(input: {
  key: string
  metadata: SeedArchiveInput
  source: ReadableStream<Uint8Array>
  reservedAt: Date
}) {
  const remaining =
    INTAKE_TIMEOUT_MS - (clock.now().getTime() - input.reservedAt.getTime())
  if (remaining <= 0) invalidArchive()
  const reader = input.source.getReader()
  const hash = new Bun.CryptoHasher("sha256")
  const deadline = AbortSignal.timeout(remaining)
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
    pull: archivePull({ reader, hash, metadata: input.metadata, deadline }),
    async cancel(reason) {
      await reader.cancel(reason)
    },
  })
  const abort = () =>
    streamController?.error(
      new ApiError("validation", { archive: "validation.seed_archive_timeout" })
    )
  deadline.addEventListener("abort", abort, { once: true })
  try {
    await seedArchives.put(input.key, stream, deadline)
  } finally {
    deadline.removeEventListener("abort", abort)
    await reader.cancel()
    reader.releaseLock()
  }
}

interface ChunkReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>
}

function checkFinalArchive(
  bytes: number,
  hash: Bun.CryptoHasher,
  metadata: SeedArchiveInput
) {
  if (
    bytes !== metadata.archiveBytes ||
    hash.digest("hex") !== metadata.archiveDigest
  ) {
    invalidArchive()
  }
}

function checkChunkSize(bytes: number, maxBytes: number) {
  if (bytes > ARCHIVE_MAX_BYTES || bytes > maxBytes) {
    invalidArchive()
  }
}

function archivePull(input: {
  reader: ChunkReader
  hash: Bun.CryptoHasher
  metadata: SeedArchiveInput
  deadline: AbortSignal
}) {
  let bytes = 0
  return async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    input.deadline.throwIfAborted()
    const next = await input.reader.read()
    input.deadline.throwIfAborted()
    if (next.done || !next.value) {
      checkFinalArchive(bytes, input.hash, input.metadata)
      controller.close()
      return
    }
    bytes += next.value.byteLength
    checkChunkSize(bytes, input.metadata.archiveBytes)
    input.hash.update(next.value)
    controller.enqueue(next.value)
  }
}

function invalidArchive(): never {
  fail.validation({ archive: "validation.seed_archive" })
}
