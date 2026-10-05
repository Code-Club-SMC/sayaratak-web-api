import { z } from "zod"

import { identifierSchema } from "@/schemas/fields"

export const identifierFormSchema = z.object({ identifier: identifierSchema })
export const passwordFormSchema = z.object({
  password: z.string().min(1, "validation.required"),
})
export type PasswordForm = z.infer<typeof passwordFormSchema>
export type IdentifierForm = z.infer<typeof identifierFormSchema>
