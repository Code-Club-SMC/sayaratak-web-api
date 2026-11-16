import { afterEach, beforeEach, expect, test } from "bun:test"

import { env } from "~/env"

import { ApiError } from "~/shared/http/errors"

import {
  isSeedArchiveSourceMissing,
  seedArchiveKey,
  seedArchives,
} from "./seed-archives"

const key = seedArchiveKey({
  datasetId: "dataset",
  operationId: "operation",
  digest: "a".repeat(64),
})
const original = {
  appEnv: env.APP_ENV,
  nodeEnv: env.NODE_ENV,
  accountId: env.R2_ACCOUNT_ID,
}
beforeEach(() => {
  env.APP_ENV = "test"
})
afterEach(() => {
  env.APP_ENV = original.appEnv
  env.NODE_ENV = original.nodeEnv
  env.R2_ACCOUNT_ID = original.accountId
})

test("private test archives round-trip exact bytes without touching backup storage", async () => {
  const bytes = new Uint8Array([1, 2, 3])
  expect(await seedArchives.put(key, new Blob([bytes]).stream())).toBe(3)
  expect(await seedArchives.download(key)).toEqual(bytes)
  await seedArchives.remove(key)
  await expect(seedArchives.download(key)).rejects.toThrow()
})

test("rejects client paths and keys outside the isolated archive namespace", async () => {
  for (const invalid of [
    "backups/file.zip",
    "admin-seed/../file.zip",
    "/admin-seed/file.zip",
  ]) {
    await expect(seedArchives.download(invalid)).rejects.toThrow()
    await expect(seedArchives.remove(invalid)).rejects.toThrow()
  }
})

test("a failed source never publishes a partial test archive", async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1]))
      controller.error(new Error("disconnected"))
    },
  })
  await expect(seedArchives.put(key, source)).rejects.toThrow()
  await expect(seedArchives.download(key)).rejects.toThrow()
})

test("a hosted-style environment without R2 fails closed instead of using the test fake", async () => {
  env.NODE_ENV = "production"
  env.R2_ACCOUNT_ID = undefined
  await expect(
    seedArchives.put(key, new Blob(["archive"]).stream())
  ).rejects.toThrow("forbidden")
  await expect(seedArchives.download(key)).rejects.toThrow("forbidden")
})

test("only confirmed archive absence is classified as expired source", () => {
  expect(isSeedArchiveSourceMissing({ code: "NoSuchKey" })).toBe(true)
  expect(isSeedArchiveSourceMissing({ code: "NotFound" })).toBe(true)
  expect(
    isSeedArchiveSourceMissing(
      new ApiError("not_found", {
        archive: "validation.seed_archive_source_expired",
      })
    )
  ).toBe(true)
  expect(isSeedArchiveSourceMissing({ code: "AccessDenied" })).toBe(false)
  expect(isSeedArchiveSourceMissing(new ApiError("not_found"))).toBe(false)
})
