import { db } from "~/shared/db/client"
import { fail } from "~/shared/http/errors"

import { toSite } from "./content.mapper"
import * as q from "./content.queries"

/** The public site details: contact and locales only, never banking or moderation settings. */
export async function getSite() {
  const row = await q.getSettings(db)
  // db:bootstrap writes the one settings row; a database without it has no site to show.
  if (!row) fail.notFound()
  return toSite(row)
}
