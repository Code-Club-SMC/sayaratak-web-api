import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { user } from "./auth.tables"

export function getUserLocale(ex: Executor, email: string) {
  return ex
    .select({ locale: user.locale })
    .from(user)
    .where(eq(user.email, email))
    .then(([row]) => row?.locale)
}
