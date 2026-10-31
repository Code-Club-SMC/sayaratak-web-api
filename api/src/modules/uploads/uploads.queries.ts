import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { uploads } from "./uploads.tables"

export function getUpload(ex: Executor, id: string) {
  return ex
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .then(([row]) => row)
}
