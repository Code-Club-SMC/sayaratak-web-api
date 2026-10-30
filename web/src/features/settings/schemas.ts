import { z } from "zod"

import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
} from "@sayaratak/shared/schemas/fields"

// The fields are strings, "" meaning empty, so every input stays controlled. The avatar is the stored url, as `PATCH /me` takes it.
export const profileFormSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema.or(z.literal("")),
    phone: phoneSchema.or(z.literal("")),
    cityId: z.string(),
    avatarUrl: z.string(),
  })
  .refine((v) => !!v.email || !!v.phone, {
    path: ["email"],
    message: "validation.contact_required",
  })
export type ProfileForm = z.infer<typeof profileFormSchema>

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.required"),
    newPassword: passwordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "validation.password_same",
  })
export type PasswordForm = z.infer<typeof passwordFormSchema>

// An account made with Google or Facebook has no current password to give; the field is left out and sent empty.
export const newPasswordFormSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
})

export const deleteAccountSchema = z.object({
  phrase: z
    .string()
    .trim()
    .refine((v): boolean => v === "DELETE" || v === "حذف", "validation.phrase"),
})
export type DeleteAccountForm = z.infer<typeof deleteAccountSchema>
