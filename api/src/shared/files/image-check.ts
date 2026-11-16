import sharp from "sharp"

import { fail } from "~/shared/http/errors"

const IMAGE_MAX_BYTES = 2 * 1024 * 1024
const IMAGE_MAX_PIXELS = 4096 * 3072
sharp.cache({ memory: 8, files: 0, items: 8 })
sharp.concurrency(1)
let decoderTail: Promise<void> = Promise.resolve()

export type CheckedSeedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp"
  width: number
  height: number
  bytes: number
  digest: string
}

/** Decodes one complete image at a time, including callers from separate archive passes. */
export async function checkSeedImage(
  bytes: Uint8Array<ArrayBuffer>
): Promise<CheckedSeedImage> {
  if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) invalidImage()
  const previous = decoderTail
  let release = () => {}
  decoderTail = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await decodeImage(bytes)
  } finally {
    release()
  }
}

async function decodeImage(
  bytes: Uint8Array<ArrayBuffer>
): Promise<CheckedSeedImage> {
  const image = sharp(bytes, {
    failOn: "warning",
    limitInputPixels: IMAGE_MAX_PIXELS,
  })
  try {
    const metadata = await image.metadata()
    const { width, height, format } = metadata
    if (!width || !height || (metadata.pages ?? 1) !== 1) invalidImage()
    if (width < 1200 || width > 4096 || height < 900 || height > 3072)
      invalidImage()
    if (width * 3 !== height * 4) invalidImage()
    const mime = imageMime(format)
    await image.raw().toBuffer()
    return {
      mime,
      width,
      height,
      bytes: bytes.byteLength,
      digest: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    }
  } finally {
    image.destroy()
  }
}

function imageMime(format: string | undefined): CheckedSeedImage["mime"] {
  if (format === "jpeg") return "image/jpeg"
  if (format === "png") return "image/png"
  if (format === "webp") return "image/webp"
  return invalidImage()
}

function invalidImage(): never {
  fail.validation({ image: "validation.seed_image" })
}
