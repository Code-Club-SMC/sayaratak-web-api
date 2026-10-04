import { z } from "zod"

// Only the locale lives here for now; step 2.1 adds the rest of A7 fields.ts.
export const localeSchema = z.enum(["ar", "en"])
export type Locale = z.infer<typeof localeSchema>
