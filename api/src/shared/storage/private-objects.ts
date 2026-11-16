export type PrivateObjectAccess = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

/** Private transport shared by archives and backups, without a development fallback. */
export function privateObjects(access: PrivateObjectAccess) {
  const s3 = new Bun.S3Client({
    accessKeyId: access.accessKeyId,
    secretAccessKey: access.secretAccessKey,
    bucket: access.bucket,
    endpoint: `https://${access.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  })
  return {
    async put(
      key: string,
      source: ReadableStream<Uint8Array>,
      signal?: AbortSignal
    ) {
      const sink = s3.file(key).writer()
      let bytes = 0
      let completed = false
      let abortError: ApiError | undefined
      const abort = () => {
        abortError = new ApiError("server_error")
      }
      signal?.addEventListener("abort", abort, { once: true })
      try {
        for await (const chunk of source) {
          signal?.throwIfAborted()
          bytes += chunk.byteLength
          await sink.write(chunk)
        }
        signal?.throwIfAborted()
        await sink.end()
        completed = true
        return bytes
      } finally {
        // A rejected source must abort multipart data, never finalize a partial object.
        signal?.removeEventListener("abort", abort)
        if (abortError) {
          await sink.end(abortError)
        } else if (!completed) {
          await sink.end(new ApiError("server_error"))
        }
      }
    },
    async download(key: string, path: string) {
      await Bun.write(path, s3.file(key))
    },
    read(key: string) {
      return s3.file(key).stream()
    },
    async remove(key: string) {
      await s3.delete(key)
    },
  }
}
import { ApiError } from "~/shared/http/errors"
