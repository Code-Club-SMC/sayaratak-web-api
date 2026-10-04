import { normalizeDigits } from "@/lib/digits"

// Readable URL: Arabic letters kept, harakat and tatweel dropped, Latin lowercased, 60 characters of words, then the short id.
export function makeListingSlug(title: string, city: string, id: string) {
  const words = normalizeDigits(`${title} ${city}`)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "")
  return words ? `${words}-${id}` : id
}

// The id is whatever follows the last hyphen; the words in front only matter for SEO.
export const parseListingId = (slug: string) =>
  slug.slice(slug.lastIndexOf("-") + 1)
