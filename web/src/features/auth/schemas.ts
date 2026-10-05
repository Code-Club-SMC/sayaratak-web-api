import { z } from "zod"

import { identifierSchema, nameSchema, passwordSchema } from "@/schemas/fields"

export const identifierFormSchema = z.object({ identifier: identifierSchema })
export const passwordFormSchema = z.object({
  password: z.string().min(1, "validation.required"),
})
export const createAccountSchema = z.object({
  fullName: nameSchema,
  password: passwordSchema,
})
export type CreateAccountForm = z.infer<typeof createAccountSchema>
export type PasswordForm = z.infer<typeof passwordFormSchema>
export type IdentifierForm = z.infer<typeof identifierFormSchema>
export const otpFormSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "validation.otp"),
})
