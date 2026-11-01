import type { SitePage } from "@sayaratak/shared/schemas/admin"
import type { Site } from "@sayaratak/shared/schemas/responses"

import type { SettingsRow, SitePageRow } from "./content.tables"

export function toSite(row: SettingsRow): Site {
  return {
    contact: row.contact,
    locales: row.locales,
  }
}

export function toSitePage(row: SitePageRow): SitePage {
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    updatedAt: row.updatedAt.toISOString(),
  }
}
