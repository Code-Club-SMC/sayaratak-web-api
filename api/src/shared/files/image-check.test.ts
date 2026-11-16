import { expect, test } from "bun:test"
import sharp from "sharp"

import { checkSeedImage } from "./image-check"

test("fully decodes real JPEG, PNG and WebP and hashes the original bytes", async () => {
  const formats: ("jpeg" | "png" | "webp")[] = ["jpeg", "png", "webp"]
  for (const format of formats) {
    const bytes = new Uint8Array(
      await sharp({
        create: {
          width: 1200,
          height: 900,
          channels: 3,
          background: "#246842",
        },
      })
        .toFormat(format)
        .toBuffer()
    )
    expect(await checkSeedImage(bytes)).toEqual({
      mime: `image/${format}`,
      width: 1200,
      height: 900,
      bytes: bytes.length,
      digest: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    })
  }
})

test("a JPEG signature without decodable pixels is rejected", async () => {
  await expect(
    checkSeedImage(Uint8Array.from([255, 216, 255, 224, 0, 16]))
  ).rejects.toThrow()
})

test("rejects malformed pixel payloads even when metadata is readable", async () => {
  const bytes = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#246842" },
  })
    .jpeg()
    .toBuffer()
  await expect(
    checkSeedImage(new Uint8Array(bytes.subarray(0, bytes.length - 100)))
  ).rejects.toThrow()
})

test("rejects unsupported formats, undersized and non-4:3 images", async () => {
  for (const [width, height] of [
    [1200, 800],
    [800, 600],
    [4100, 3075],
  ] as const) {
    const bytes = new Uint8Array(
      await sharp({
        create: { width, height, channels: 3, background: "#246842" },
      })
        .png()
        .toBuffer()
    )
    await expect(checkSeedImage(bytes)).rejects.toThrow()
  }
  const gif = new Uint8Array(
    await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#246842" },
    })
      .gif()
      .toBuffer()
  )
  await expect(checkSeedImage(gif)).rejects.toThrow()
})

test("rejects compressed byte limits before invoking the decoder", async () => {
  await expect(
    checkSeedImage(new Uint8Array(2 * 1024 * 1024 + 1))
  ).rejects.toThrow()
})

test("rejects a real animated WebP rather than silently accepting its first frame", async () => {
  const pixels = new Uint8Array(1200 * 1800 * 3)
  pixels.fill(255, pixels.length / 2)
  const animated = new Uint8Array(
    await sharp(pixels, {
      raw: { width: 1200, height: 1800, pageHeight: 900, channels: 3 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer()
  )
  expect((await sharp(animated).metadata()).pages).toBe(2)
  await expect(checkSeedImage(animated)).rejects.toThrow()
})
