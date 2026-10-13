import { z } from "zod"

// `?welcome=1` shows the welcome notice once, after onboarding; `plan` is the paid plan picked there. Anything else is ignored.
export const overviewSearchSchema = z.object({
  welcome: z.coerce.number().optional().catch(undefined),
  plan: z.string().optional().catch(undefined),
})
