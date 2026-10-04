import { uploadSchema } from "@/schemas/api"

import { db, newId } from "../db"
import { fail, route } from "../http"

const MAX_BYTES = 5 * 1024 * 1024

// Files live in a server-side Map; the url is served by GET /uploads/:id.
export async function storeUpload(file: File) {
  if (file.size > MAX_BYTES)
    throw fail(422, "validation", { file: "validation.file_size_5mb" })
  const id = newId("up")
  db.uploads.set(id, {
    id,
    name: file.name,
    type: file.type,
    bytes: await file.arrayBuffer(),
  })
  const kind = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "file"
  return uploadSchema.parse({
    id,
    url: `/api/uploads/${id}`,
    type: kind,
    name: file.name,
    size: file.size,
  })
}

route("POST", "/uploads", async (c) => {
  const file = (await c.form()).get("file")
  if (!(file instanceof File))
    throw fail(422, "validation", { file: "validation.required" })
  return Response.json(await storeUpload(file), { status: 201 })
})

route("GET", "/uploads/:id", (c) => {
  const row = db.uploads.get(c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  return new Response(row.bytes, {
    headers: {
      "content-type": row.type || "application/octet-stream",
      "cache-control": "public, max-age=3600",
    },
  })
})
