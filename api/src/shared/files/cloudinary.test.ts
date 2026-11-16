import { expect, spyOn, test } from "bun:test"

import { env } from "~/env"

import { cloudinaryStore } from "./cloudinary"
import type { PutFile } from "./store"

const CREDENTIALS = "cloudinary://test-key:test-secret@test-cloud"

test("Cloudinary retries immutable bytes under the exact reserved ID without altering normal uploads", async () => {
  const bytes = Uint8Array.from([1, 2, 3])
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  const immutableKey = `sayaratak/${env.APP_ENV}/seed/dataset/operation/asset/1/${digest}`
  const forms: FormData[] = []
  const request = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (_url: string | URL | Request, options?: RequestInit) => {
        if (!(options?.body instanceof FormData))
          throw new Error("form missing")
        forms.push(options.body)
        return Response.json({
          public_id: options.body.get("public_id") ?? "normal-id",
          width: 2560,
          height: 1920,
        })
      },
      { preconnect: globalThis.fetch.preconnect }
    )
  )
  try {
    const store = cloudinaryStore(CREDENTIALS)
    const file: PutFile = {
      bytes,
      mime: "image/jpeg",
      delivery: "public",
      folder: "images",
    }
    const first = await store.put({ ...file, immutableKey })
    const second = await store.put({ ...file, immutableKey })
    expect(first.publicId).toBe(immutableKey)
    expect(second.publicId).toBe(immutableKey)
    expect(forms[0]?.get("folder")).toBeNull()
    expect(forms[0]?.get("overwrite")).toBe("true")
    expect(forms[0]?.get("transformation")).toBe(
      "c_limit,h_2560,q_auto:good,w_2560"
    )
    await store.put(file)
    expect(forms[2]?.get("folder")).toBe(`sayaratak/${env.APP_ENV}/images`)
    expect(forms[2]?.get("public_id")).toBeNull()
    await expect(
      store.put({ ...file, immutableKey, bytes: Uint8Array.from([9]) })
    ).rejects.toThrow()
    expect(forms).toHaveLength(3)
  } finally {
    request.mockRestore()
  }
})

test("Cloudinary rejects a returned ID that differs from the persisted intent", async () => {
  const bytes = Uint8Array.from([1])
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ public_id: "unowned", width: 1200, height: 900 })
  )
  try {
    await expect(
      cloudinaryStore(CREDENTIALS).put({
        bytes,
        mime: "image/jpeg",
        delivery: "public",
        folder: "seed",
        immutableKey: `sayaratak/${env.APP_ENV}/seed/dataset/operation/asset/1/${digest}`,
      })
    ).rejects.toThrow("immutable provider identity mismatch")
  } finally {
    request.mockRestore()
  }
})
