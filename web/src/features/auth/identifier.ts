import { normalizeDigits } from "@/lib/digits"
import { normalizePhone } from "@/lib/phone"

// Phone-looking while typing: digits (any script), +, spaces, brackets and dashes only.
export const looksLikePhone = (value: string) =>
  /^[+\d\s()-]+$/.test(normalizeDigits(value).trim())

export const identifierKind = (value: string) =>
  value.includes("@") ? "email" : "phone"

// Lowercase email or E.164 phone, the same value the API looks accounts up by.
export const normalizeIdentifier = (value: string) =>
  identifierKind(value) === "email"
    ? value.trim().toLowerCase()
    : normalizePhone(value)
