import { beforeEach, describe, expect, test } from "bun:test"
import { siteSchema } from "@sayaratak/shared/schemas/responses"
import { z } from "zod"

import { db } from "~/shared/db/client"

import { buildSeed, expectSchema, req, resetDb } from "../../../tests/helpers"
import { settings } from "./content.tables"

const seeded = buildSeed().settings
const CONTACT_KEYS = ["address", "email", "phone", "whatsapp"]

beforeEach(resetDb)

describe("GET /site", () => {
  test("answers the contact details and locales from the settings", async () => {
    const res = await req("/site")
    expect(res.status).toBe(200)
    const site = await expectSchema(res, siteSchema)
    expect(site).toEqual({ contact: seeded.contact, locales: seeded.locales })
  })

  test("never shows banking or moderation settings", async () => {
    const body = await (await req("/site")).json()
    const site = z.record(z.string(), z.unknown()).parse(body)
    const contact = z.record(z.string(), z.unknown()).parse(site.contact)
    expect(Object.keys(site).sort()).toEqual(["contact", "locales"])
    expect(Object.keys(contact).sort()).toEqual(CONTACT_KEYS)
  })

  test("answers 404 not_found when the settings row is missing", async () => {
    await db.delete(settings)
    const res = await req("/site")
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: "not_found" })
  })
})
