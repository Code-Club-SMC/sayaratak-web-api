import { seedStatusSchema } from "@sayaratak/shared/schemas/admin-seed"
import sharp from "sharp"

import { buildSeedManifest } from "~/modules/admin-seed/admin-seed.catalog.service"

import { adminCaller } from "./admin"
import { req, signIn } from "./helpers"
import { seedZipFixture } from "./seed-zip-fixture"

export async function archiveFixture(count: number, corruptLast = false) {
  const image = new Uint8Array(
    await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#246842" },
    })
      .jpeg()
      .toBuffer()
  )
  const assets = buildSeedManifest().assets.slice(0, count)
  const bytes = seedZipFixture(
    assets.map((asset, index) => ({
      filename: asset.filename,
      bytes:
        corruptLast && index === count - 1
          ? new Uint8Array([255, 216, 255])
          : image,
    }))
  )
  return {
    image,
    bytes,
    digest: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
  }
}

export async function uploadFixture(
  fixture: Awaited<ReturnType<typeof archiveFixture>>,
  options: {
    body?: Uint8Array | string | ReadableStream
    supersedesOperationId?: string
  } = {}
) {
  const admin = adminCaller()
  const prepared = seedStatusSchema.parse(
    await (await admin("POST", "/admin/seed/prepare", {})).json()
  )
  const session = await signIn("admin")
  const query = new URLSearchParams({
    archiveDigest: fixture.digest,
    archiveBytes: String(fixture.bytes.length),
    manifestDigest: prepared.dataset?.manifestDigest ?? "",
  })
  if (options.supersedesOperationId)
    query.set("supersedesOperationId", options.supersedesOperationId)
  return req(`/admin/seed/archives?${query}`, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      origin: session.origin,
      "content-type": "application/zip",
    },
    body: options.body ?? fixture.bytes,
  })
}
