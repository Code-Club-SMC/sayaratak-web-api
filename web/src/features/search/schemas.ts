import { z } from "zod"

import {
  fuelSchema,
  intentSchema,
  transmissionSchema,
  vehicleTypeSchema,
} from "@/schemas/listing"

// Bad URL values are dropped, never crash the page.
const optional = <T extends z.ZodTypeAny>(s: T) => s.optional().catch(undefined)

export const searchParamsSchema = z.object({
  kind: z.enum(["vehicle", "part"]).default("vehicle").catch("vehicle"),
  intent: optional(intentSchema),
  type: optional(vehicleTypeSchema),
  q: optional(z.string().trim().max(80)),
  city: optional(z.string()),
  district: optional(z.string()),
  make: optional(z.string()),
  model: optional(z.string()),
  minPrice: optional(z.coerce.number().int().min(0)),
  maxPrice: optional(z.coerce.number().int().min(0)),
  minYear: optional(z.coerce.number().int().min(1970)),
  maxYear: optional(z.coerce.number().int()),
  maxMileage: optional(z.coerce.number().int().min(0)),
  fuel: optional(z.array(fuelSchema)),
  transmission: optional(z.array(transmissionSchema)),
  condition: optional(z.enum(["new", "used"])),
  partCategory: optional(z.string()),
  radius: optional(
    z.coerce.number().refine((v) => [5, 10, 25, 50, 100].includes(v))
  ),
  lat: optional(z.coerce.number()),
  lng: optional(z.coerce.number()),
  verifiedOnly: optional(z.boolean()),
  hasVideo: optional(z.boolean()),
  includeSold: z.boolean().default(false).catch(false),
  seller: optional(z.string()), // owner id, used by profile inventory tabs
  sort: z
    .enum([
      "relevance",
      "newest",
      "price_asc",
      "price_desc",
      "year_desc",
      "mileage_asc",
      "nearest",
    ])
    .default("relevance")
    .catch("relevance"),
  page: z.coerce.number().int().min(1).default(1).catch(1),
})
export type SearchParams = z.infer<typeof searchParamsSchema>
