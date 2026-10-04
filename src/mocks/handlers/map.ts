import { mapPointSchema, type MapPoint } from "@/schemas/api"
import { z } from "zod"

import { db } from "../db"
import { route } from "../http"
import { tierOf } from "../search"

const MAX_POINTS = 300

// bbox is "west,south,east,north"; layers is a comma list.
route("GET", "/map", (c) => {
  const layers = new Set(
    (c.query.get("layers") ?? "vehicles,dealerships,workshops,mechanics").split(
      ","
    )
  )
  const [west = -180, south = -90, east = 180, north = 90] = (
    c.query.get("bbox") ?? ""
  )
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  const inside = (
    p: { lat: number; lng: number } | null
  ): p is { lat: number; lng: number } =>
    Boolean(
      p && p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north
    )
  const points: MapPoint[] = []
  if (layers.has("vehicles")) {
    const listings = db.listings
      .filter(
        (l) =>
          l.moderation === "approved" &&
          l.status === "available" &&
          l.kind === "vehicle"
      )
      .sort((a, b) => tierOf(b) - tierOf(a))
    for (const l of listings)
      if (inside(l.location))
        points.push({
          id: l.id,
          layer: "vehicles",
          lat: l.location.lat,
          lng: l.location.lng,
          title: l.title,
          price: l.price,
          image: l.media[0]?.url,
          href: `/listing/${l.slug}`,
        })
  }
  const businesses = [
    ["dealerships", db.dealerships],
    ["workshops", db.workshops],
  ] as const
  for (const [layer, rows] of businesses) {
    if (!layers.has(layer)) continue
    for (const b of rows)
      if (b.status === "active" && inside(b.location))
        points.push({
          id: b.id,
          layer,
          lat: b.location.lat,
          lng: b.location.lng,
          title: b.name,
          image: b.logoUrl,
          href: `/${layer}/${b.slug}`,
        })
  }
  if (layers.has("mechanics")) {
    for (const m of db.mechanics) {
      const city = db.taxonomy.cities.find((x) => x.id === m.cityId)
      if (m.status === "active" && inside(city?.center ?? null) && city)
        points.push({
          id: m.id,
          layer: "mechanics",
          lat: city.center.lat,
          lng: city.center.lng,
          title: m.name,
          image: m.photoUrl,
          href: `/mechanics/${m.slug}`,
        })
    }
  }
  return z.array(mapPointSchema).parse(points.slice(0, MAX_POINTS))
})
