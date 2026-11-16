import { expect, test } from "bun:test"

import { FAKE_SIZE, fakeStore } from "./fake"
import type { PutFile } from "./store"

test("immutable retries retain one provider identity after a lost acknowledgment", async () => {
  const store = fakeStore()
  const file: PutFile = {
    bytes: Uint8Array.from([1, 2, 3]),
    mime: "image/jpeg",
    delivery: "public",
    folder: "seed/test",
    immutableKey: "asset-01-content-digest",
  }
  await store.put(file)
  // The caller never recorded the first answer and must submit the same intent.
  const second = await store.put(file)
  expect(second.publicId).toBe("asset-01-content-digest")
  expect(store.saved.size).toBe(1)
  expect(second.width).toBe(FAKE_SIZE.width)
  expect(second.height).toBe(FAKE_SIZE.height)
  await expect(
    store.put({ ...file, bytes: Uint8Array.from([4]) })
  ).rejects.toThrow()
})

test("ordinary fake uploads keep their generated identities and default dimensions", async () => {
  const store = fakeStore()
  const file: PutFile = {
    bytes: Uint8Array.from([1]),
    mime: "image/png",
    delivery: "public",
    folder: "images",
  }
  const first = await store.put(file)
  const second = await store.put(file)
  expect(first.publicId).not.toBe(second.publicId)
  expect(store.saved.size).toBe(2)
  expect(first).toMatchObject(FAKE_SIZE)
})
