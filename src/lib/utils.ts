import type { Locale } from "@/schemas/fields"

export { cn } from "cn"

// Arabic is the only RTL locale; one place decides `dir`.
export const isRtl = (locale: Locale) => locale === "ar"
