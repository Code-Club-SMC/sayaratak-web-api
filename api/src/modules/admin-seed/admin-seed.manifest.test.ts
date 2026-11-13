import { expect, test } from "bun:test"

import {
  buildSeedManifest,
  getManifestDigest,
} from "./admin-seed.catalog.service"
import { renderSeedPromptPack } from "./admin-seed.prompts.service"

test("the catalog is deterministic and has exactly the approved distribution", () => {
  const first = buildSeedManifest()
  expect(first).toEqual(buildSeedManifest())
  expect(first.records).toHaveLength(230)
  expect(first.owners).toHaveLength(30)
  const counts = new Map<string, number>()
  for (const row of first.records) {
    const group =
      row.kind === "vehicle" || row.kind === "part" ? row.group : row.kind
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  expect(Object.fromEntries(counts)).toEqual({
    cars: 100,
    trucks: 20,
    motorcycles: 20,
    tuk_tuks: 10,
    parts: 25,
    rentals: 25,
    dealership: 10,
    workshop: 10,
    mechanic: 10,
  })
  expect(getManifestDigest(first)).toMatch(/^[a-f0-9]{64}$/)
  expect(getManifestDigest(first)).toBe(getManifestDigest(buildSeedManifest()))
})

test("each record has two complete uniquely named prompts and valid ownership", () => {
  const manifest = buildSeedManifest()
  expect(manifest.assets).toHaveLength(460)
  expect(new Set(manifest.records.map((row) => row.id)).size).toBe(230)
  expect(new Set(manifest.assets.map((row) => row.filename)).size).toBe(460)
  const owners = new Map(manifest.owners.map((row) => [row.id, row]))
  for (const record of manifest.records) {
    const images = manifest.assets.filter((row) => row.recordId === record.id)
    expect(images).toHaveLength(2)
    expect(images[1]?.referenceFilename).toBe(images[0]?.filename)
    expect(record.name.ar.length).toBeGreaterThan(3)
    expect(record.description.en.length).toBeGreaterThan(30)
    expect(owners.has(record.ownerId)).toBe(true)
    if (record.kind === "vehicle" || record.kind === "part") {
      expect(record.id).toMatch(/^l[0-9a-z]{5}$/)
      expect(owners.get(record.ownerId)?.role).toBe("dealership")
      expect(Number.isSafeInteger(record.price)).toBe(true)
    }
    for (const image of images) {
      expect(image.prompt.length).toBeGreaterThan(200)
      expect(image.prompt).toContain(record.name.en)
      expect(image.width).toBe(1600)
      expect(image.height).toBe(1200)
      expect(image.allowedFilenames).toHaveLength(3)
    }
  }
})

test("the portable prompt pack includes every prompt without credentials or clock data", () => {
  const manifest = buildSeedManifest()
  const pack = renderSeedPromptPack(manifest)
  expect(JSON.parse(pack).assets).toHaveLength(460)
  expect(pack).not.toMatch(/password|@|phone|whatsapp|token|createdAt/i)
  expect(pack).toContain("4:3")
  expect(pack).toContain("reference image")
  const changed = structuredClone(manifest)
  const asset = changed.assets[0]
  if (!asset) throw new Error("the catalog has an image")
  asset.prompt += " Additional natural daylight."
  expect(getManifestDigest(changed)).not.toBe(getManifestDigest(manifest))
})
