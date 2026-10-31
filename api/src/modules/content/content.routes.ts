import { siteSchema } from "@sayaratak/shared/schemas/responses"
import { Hono } from "hono"

import { spec } from "~/shared/openapi/registry"

import { getSite } from "./content.service"

export const contentRoutes = new Hono()

contentRoutes.get(
  "/site",
  spec({
    summary: "Public site details: contact and languages",
    access: "public",
    responses: { 200: siteSchema },
    errors: ["not_found"],
  }),
  async (c) => {
    const site = await getSite()
    return c.json(site)
  }
)
