import { mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname } from "node:path"

import { env } from "~/env"

import { privateObjects } from "./private-objects"

/** The private bucket of database backups (A2): objects are only ever written, read back by the restore command and deleted. */
export type BackupStore = {
  /** Streams `source` to `key` and answers how many bytes it held. */
  put(key: string, source: ReadableStream<Uint8Array>): Promise<number>
  /** Saves the object to a local file. An object that is not there rejects. */
  download(key: string, path: string): Promise<void>
  /** Deletes the object; one that is not there is fine. */
  remove(key: string): Promise<void>
}

// Files in a temp folder instead of memory, so the restore command (a second process) finds what a test or a dev server saved.
const FAKE_DIR = `${tmpdir()}/sayaratak-fake-r2`

function fakeStore(): BackupStore {
  return {
    async put(key, source) {
      const path = `${FAKE_DIR}/${key}`
      await mkdir(dirname(path), { recursive: true })
      return Bun.write(path, new Response(source))
    },
    async download(key, path) {
      await Bun.write(path, Bun.file(`${FAKE_DIR}/${key}`))
    },
    async remove(key) {
      await rm(`${FAKE_DIR}/${key}`, { force: true })
    },
  }
}

/**
 * R2 when its four values are set, else files under the temp folder (A13: only mail and files are
 * faked). Tests use the fake unless `R2_LIVE=1`, which runs the live check of 8.11 against the
 * owner's bucket.
 */
export const backupFiles: BackupStore =
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET &&
  (env.NODE_ENV !== "test" || Bun.env.R2_LIVE === "1")
    ? privateObjects({
        accountId: env.R2_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET,
      })
    : fakeStore()
