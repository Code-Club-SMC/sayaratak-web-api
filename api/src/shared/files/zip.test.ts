import { expect, test } from "bun:test"

import { seedZipFixture } from "../../../tests/seed-zip-fixture"
import { openSeedArchive } from "./zip"

const image = new Uint8Array([1, 2, 3, 4])
const valid = { filename: "vehicle-01.jpg", bytes: image }

test("uses the standard CRC-32 value, not a different Bun hash algorithm", () => {
  expect(Bun.hash.crc32(new TextEncoder().encode("123456789"))).toBe(3421780262)
})

test("reads actual stored and deflated entry bytes with verified CRC", async () => {
  for (const method of [0, 8]) {
    const archive = await openSeedArchive(
      seedZipFixture([{ ...valid, method }])
    )
    try {
      for await (const entry of archive.entries())
        expect(await entry.read()).toEqual(image)
    } finally {
      archive.close()
    }
  }
})

test("rejects traversal, absolute, nested, directories, unexpected formats and symlinks before reading", async () => {
  for (const filename of [
    "../car.jpg",
    "/car.jpg",
    "nested/car.jpg",
    "folder/",
    "car.zip",
  ]) {
    await expect(
      openSeedArchive(seedZipFixture([{ ...valid, filename }]))
    ).rejects.toThrow()
  }
  await expect(
    openSeedArchive(seedZipFixture([{ ...valid, attributes: 0xa1ff0000 }]))
  ).rejects.toThrow()
})

test("rejects duplicate logical asset IDs even across extensions", async () => {
  await expect(
    openSeedArchive(
      seedZipFixture([valid, { ...valid, filename: "vehicle-01.png" }])
    )
  ).rejects.toThrow()
})

test("preflights encrypted, unsupported compression, count and expanded limits", async () => {
  for (const mutation of [
    { flags: 1 },
    { method: 12 },
    { expandedSize: 2 * 1024 * 1024 + 1 },
  ]) {
    await expect(
      openSeedArchive(
        seedZipFixture([
          valid,
          { ...valid, filename: "vehicle-02.jpg", ...mutation },
        ])
      )
    ).rejects.toThrow()
  }
  const entries = Array.from({ length: 51 }, (_, index) => ({
    ...valid,
    filename: `vehicle-${index}.jpg`,
  }))
  await expect(openSeedArchive(seedZipFixture(entries))).rejects.toThrow()
})

test("rejects corrupt directory, malformed ZIP and central-directory CRC mismatch", async () => {
  await expect(openSeedArchive(new Uint8Array([1, 2, 3]))).rejects.toThrow()
  const archive = await openSeedArchive(
    seedZipFixture([{ ...valid, crc32: 0 }])
  )
  try {
    for await (const entry of archive.entries())
      await expect(entry.read()).rejects.toThrow()
  } finally {
    archive.close()
  }
})

test("rejects an inflated stream that exceeds its declared size", async () => {
  const archive = await openSeedArchive(
    seedZipFixture([
      {
        ...valid,
        bytes: new Uint8Array(2 * 1024 * 1024 + 1),
        expandedSize: 4,
      },
    ])
  )
  try {
    for await (const entry of archive.entries())
      await expect(entry.read()).rejects.toThrow()
  } finally {
    archive.close()
  }
})

test("enforces the actual aggregate inflate budget even when an entry is read repeatedly", async () => {
  const archive = await openSeedArchive(
    seedZipFixture([
      {
        ...valid,
        bytes: new Uint8Array(2 * 1024 * 1024),
      },
    ])
  )
  try {
    for await (const entry of archive.entries()) {
      for (let index = 0; index < 50; index++) await entry.read()
      await expect(entry.read()).rejects.toThrow()
    }
  } finally {
    archive.close()
  }
})
