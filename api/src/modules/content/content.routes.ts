import { Hono } from "hono"

import { getSite } from "./content.service"

export const contentRoutes = new Hono()

contentRoutes.get("/site", async (c) => {
  const site = await getSite()
  return c.json(site)
})
