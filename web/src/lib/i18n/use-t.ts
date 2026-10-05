import { useTranslation } from "react-i18next"

import { localeSchema } from "@/schemas/locale"

// Thin wrapper so components get `t` and the active locale from one place.
export function useT() {
  const { t, i18n } = useTranslation()
  return { t, locale: localeSchema.catch("ar").parse(i18n.language) }
}
