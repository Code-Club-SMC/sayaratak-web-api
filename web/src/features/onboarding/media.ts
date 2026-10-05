import { buildUrl } from "@/lib/api/client"
import type { Media } from "@/schemas/listing"

export const uploadTemplate = (id: string) =>
  `${buildUrl(`/uploads/${id}`)}?w={w}`

// Drafts keep only the media id; this gives the uploaders something to show again after a refresh or Back.
export const mediaFromId = (id: string): Media => ({
  id,
  type: "image",
  url: uploadTemplate(id),
  width: 0,
  height: 0,
  placeholderColor: "",
  posterUrl: null,
})
