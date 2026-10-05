import { z } from "zod"

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(1000, "validation.too_long"),
})
export type MessageForm = z.infer<typeof messageSchema>
