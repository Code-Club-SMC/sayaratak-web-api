import type { Site } from "@sayaratak/shared/schemas/responses"

import type { SettingsRow } from "./content.tables"

export function toSite(row: SettingsRow): Site {
  return {
    contact: row.contact,
    locales: row.locales,
  }
}
