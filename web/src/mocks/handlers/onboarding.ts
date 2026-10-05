import { z } from "zod"

import { defaultWeeklyHours } from "@/lib/hours"
import { geoSchema, phoneSchema, weeklyHoursSchema } from "@/schemas/fields"
import { onboardingInputSchema } from "@/schemas/inputs"
import { interestSchema, userSchema } from "@/schemas/user"
import { DAY, slugify } from "@/mocks/seed/util"

import { db, newId } from "../db"
import { needUser, route } from "../http"
import { nowIso } from "../lib"
import { template } from "./uploads"

const phoneRows = z.array(z.object({ value: phoneSchema }))

// Creates the business record for the chosen role and ends onboarding. The forms validate before they post, so a missing or malformed field falls back to a default here.
route("POST", "/onboarding/complete", async (c) => {
  const user = needUser(c)
  const { role, payload } = await c.body(onboardingInputSchema)
  const get = <T>(schema: z.ZodType<T>, key: string) =>
    schema.safeParse(payload[key]).data
  const text = (k: string, fallback = "") => get(z.string(), k) ?? fallback
  const image = (k: string) => (text(k) ? template(text(k)) : "")
  const city = text("cityId", user.cityId ?? "khartoum")
  const district =
    db.taxonomy.districts.find((d) => d.id === text("districtId")) ??
    db.taxonomy.districts.find((d) => d.cityId === city)
  const phone = text("phone", user.phone ?? "+249900000000")
  const name = text("name", user.fullName)
  const base = {
    ownerId: user.id,
    slug: `${slugify(name) || "business"}-${user.id.slice(-4)}`,
    name,
    cityId: city,
    createdAt: nowIso(),
    rating: { avg: 0, count: 0 },
    verified: false,
    status: "active" as const,
  }
  const place = {
    districtId: district?.id ?? "",
    address: text("address"),
    location: get(geoSchema, "location") ?? null,
    hours: get(weeklyHoursSchema, "hours") ?? defaultWeeklyHours,
  }
  const whatsapp = get(phoneSchema, "whatsapp") ?? null
  if (role === "dealership") {
    const phones = get(phoneRows, "phones")?.map((p) => p.value)
    db.dealerships.push({
      ...base,
      id: newId("d"),
      logoUrl: image("logoId"),
      coverUrl: image("coverId"),
      description: text("description"),
      phones: phones?.length ? phones : [phone],
      whatsapp,
      inventoryCount: 0,
      ...place,
    })
    // Every dealership starts on the free plan; a paid choice is paid for afterwards.
    const free = db.plans.find((p) => p.audience === role && p.price === 0)
    if (free)
      db.subscriptions.push({
        id: newId("sub"),
        userId: user.id,
        planId: free.id,
        status: "active",
        startsAt: nowIso(),
        endsAt: new Date(Date.now() + free.durationDays * DAY).toISOString(),
        usage: { used: 0, limit: free.vehicleLimit ?? null },
      })
  }
  if (role === "workshop")
    db.workshops.push({
      ...base,
      id: newId("w"),
      logoUrl: "",
      description: text("description"),
      phone,
      whatsapp,
      images: [],
      services: [],
      ...place,
    })
  if (role === "mechanic")
    db.mechanics.push({
      ...base,
      id: newId("m"),
      photoUrl: "",
      bio: text("description"),
      servedCityIds: [city],
      yearsOfExperience: 0,
      specializationIds: [],
      phone,
      whatsapp,
      portfolio: [],
      available: true,
    })
  if (role === "user") {
    user.fullName = text("fullName", user.fullName)
    if (text("avatarId")) user.avatarUrl = template(text("avatarId"))
    user.interests = interestSchema.array().catch([]).parse(payload.interests)
  }
  user.role = role
  user.cityId = city
  user.onboardingDone = true
  return userSchema.parse(user)
})
