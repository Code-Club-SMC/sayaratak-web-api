import { makeListingSlug } from "@sayaratak/shared/lib/slug"
import type { ListingRow, UserRow } from "../types"
import { DAY, ago, bilingualName, roundTo } from "./util"

// Step 11.7-r7: the seed spreads 300 listings over many models and years, so no listing reached the 5 comparables the price
// position needs. Six other sellers' copies of some demo listings fix that. Built without the random source and appended
// after every other seed table, so the rest of the seed stays the same.

// Market middle as a share of the demo listing's price: above market, below market, around market.
const MIDDLES = [1 / 1.3, 1 / 0.75, 1.04]
// The six comparables' prices around that middle, and their years around the demo listing's.
const SPREAD = [0.85, 0.92, 0.97, 1, 1.03, 1.08]
const YEARS = [-1, 0, 1, 0, -1, 1]

const isAnchor = (l: ListingRow) =>
  l.moderation === "approved" &&
  l.status === "available" &&
  l.kind === "vehicle" &&
  l.intent === "sale" &&
  l.condition === "used" &&
  l.modelId !== null &&
  l.year !== null

export function priceCluster(listings: ListingRow[], users: UserRow[]) {
  const sellers = users.filter(
    (u) =>
      u.id.startsWith("u-") &&
      u.role === "user" &&
      !u.banned &&
      u.phone &&
      u.id !== "u-omar"
  )
  const models = new Set<string | null>()
  const anchors = (owner: string, count: number) => {
    const found: ListingRow[] = []
    for (const l of listings) {
      if (found.length === count) break
      if (l.ownerUserId !== owner || !isAnchor(l) || models.has(l.modelId))
        continue
      models.add(l.modelId)
      found.push(l)
    }
    return found
  }
  const picked = [...anchors("u-dealer", 3), ...anchors("u-omar", 2)]
  let n = listings.length
  return picked.flatMap((anchor, a) => {
    const middle = anchor.price * (MIDDLES[a % MIDDLES.length] ?? 1)
    return SPREAD.map((share, i) => {
      const id = `l${(++n).toString(36).padStart(5, "0")}`
      const seller = sellers[(a * SPREAD.length + i) % sellers.length]
      const year = (anchor.year ?? 0) + (YEARS[i] ?? 0)
      const swap = (text: string) =>
        text.replaceAll(String(anchor.year), String(year))
      const title = swap(anchor.title)
      const phone = seller?.phone ?? "+249912345601"
      // One copy sold 10 days ago: sold listings count for 90 days.
      const sold = i === 5
      const row: ListingRow = {
        ...structuredClone(anchor),
        id,
        slug: makeListingSlug(title, anchor.cityId, id),
        title,
        description: {
          ar: swap(anchor.description.ar),
          en: swap(anchor.description.en),
        },
        year,
        price: roundTo(middle * share, 100_000),
        status: sold ? "sold" : "available",
        soldAt: sold ? ago(10 * DAY) : undefined,
        media: anchor.media.map((m, k) => ({ ...m, id: `${id}-m${k}` })),
        promotions: [],
        owner: {
          id: seller?.id ?? "u-omar",
          type: "user",
          name: bilingualName(seller?.fullName ?? ""),
          avatarUrl: null,
          verified: Boolean(seller?.verifiedPhone),
          memberSince: seller?.createdAt ?? anchor.createdAt,
          profileSlug: null,
        },
        ownerUserId: seller?.id ?? "u-omar",
        contact: {
          ...anchor.contact,
          phone,
          whatsapp: anchor.contact.whatsapp ? phone : null,
        },
        stats: { ...anchor.stats, views: Math.round(anchor.stats.views / 2) },
      }
      return row
    })
  })
}
