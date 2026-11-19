import { z } from "zod"

import { searchParamsSchema } from "../search/schemas"
import { idSchema } from "./fields"
import { periodSchema } from "./period"

const matchSeriesSchema = z.array(
  z.object({ date: z.string(), matches: z.number().int() })
)

// The account's saved searches (step 11.7-r9, owner 2026-11-19): listings of others that went public in the window and fit each search, counted from the listings at read time (approved now; public at the admin decision, else at creation; sold ones count).
export const alertsReportSchema = z.object({
  period: periodSchema,
  searches: z.number().int(),
  alertsOn: z.number().int(),
  matches: z.number().int(),
  previous: z.number().int(),
  series: matchSeriesSchema,
  previousSeries: matchSeriesSchema,
  // Oldest saved first, as the Saved searches page lists them.
  rows: z.array(
    z.object({
      id: idSchema,
      name: z.string(),
      params: searchParamsSchema,
      alerts: z.boolean(),
      newCount: z.number().int(),
      matches: z.number().int(),
      previous: z.number().int(),
    })
  ),
})
export type AlertsReport = z.infer<typeof alertsReportSchema>
