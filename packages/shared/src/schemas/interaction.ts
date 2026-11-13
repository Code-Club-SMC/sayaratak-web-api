import { z } from "zod"

export const interactionModeSchema = z.enum(["live", "preview"])
export type InteractionMode = z.infer<typeof interactionModeSchema>

// Response-only contact shape: normal publishing inputs retain their own rules.
export const withheldContactSchema = z.strictObject({
  phone: z.null(),
  whatsapp: z.null(),
  showPhone: z.literal(false),
  methods: z.array(z.never()).length(0),
})
