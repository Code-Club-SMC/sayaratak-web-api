import { buildRankReport } from "@sayaratak/shared/lib/rank-report"
import { rankReportSchema } from "@sayaratak/shared/schemas/reports-rank"

import { db } from "../db"
import { needUser, route } from "../http"
import { businessOf, listed } from "../lib"
import { periodOf } from "../period"
import { threadsOf } from "./reports-more"

// Step 11.7-r8: the city rank of a business among listed businesses of its kind. The rules are the shared builder's, as in the api.
route("GET", "/me/reports/rank", (c) => {
  const user = needUser(c)
  const { period, current } = periodOf(c.query)
  const mine = businessOf(user)
  const rows = mine
    ? db[`${mine.type}s`].filter(
        (b: { id: string; status: string; ownerId: string }) =>
          listed(b) || b.id === mine.row?.id
      )
    : []
  return rankReportSchema.parse(
    buildRankReport({
      period,
      selfId: mine?.row?.id ?? null,
      now: Date.now(),
      peers: rows.map((b) => {
        const only = (t: string) => t === b.id
        const shown = db.reviews.filter(
          (r) => r.targetId === b.id && r.status !== "hidden"
        )
        return {
          id: b.id,
          cityId: b.cityId,
          views: current.events(only, "view").total,
          calls: current.events(only, "phone_click").total,
          whatsapp: current.events(only, "whatsapp_click").total,
          threads: threadsOf(b.ownerId),
          stars: shown.reduce((n, r) => n + r.rating, 0),
          reviews: shown.length,
        }
      }),
    })
  )
})
