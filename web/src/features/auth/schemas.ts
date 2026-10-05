import { z } from "zod"

import { identifierSchema } from "@/schemas/fields"

export const identifierFormSchema = z.object({ identifier: identifierSchema })
export type IdentifierForm = z.infer<typeof identifierFormSchema>
