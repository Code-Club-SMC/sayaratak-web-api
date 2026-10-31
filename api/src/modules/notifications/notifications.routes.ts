import { countsSchema } from "@sayaratak/shared/schemas/api"
import { Hono } from "hono"

import { spec } from "~/shared/openapi/registry"
import { requireUser } from "~/modules/auth/auth.middleware"

import { getCounts } from "./notifications.service"

export const notificationsRoutes = new Hono()

notificationsRoutes.get(
  "/me/counts",
  spec({
    summary:
      "Unread messages and notifications; admin queue sizes for an admin",
    access: "user",
    responses: { 200: countsSchema },
    errors: ["unauthenticated", "banned"],
  }),
  requireUser,
  async (c) => {
    const counts = await getCounts(c.get("user"))
    return c.json(counts)
  }
)
