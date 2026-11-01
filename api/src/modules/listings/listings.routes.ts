import { okSchema } from "@sayaratak/shared/schemas/api"
import {
  listingCreateSchema,
  listingPatchSchema,
  listingStatusInputSchema,
} from "@sayaratak/shared/schemas/inputs"
import { listingSchema } from "@sayaratak/shared/schemas/listing"
import { Hono } from "hono"

import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import { requireUser } from "~/modules/auth/auth.middleware"

import {
  deleteListing,
  duplicateListing,
  renewListing,
  setListingStatus,
} from "./listings.actions.service"
import { createListing, patchListing } from "./listings.write.service"

const OWNER_ERRORS = [
  "unauthenticated",
  "banned",
  "forbidden",
  "not_found",
] as const

export const listingsRoutes = new Hono()

listingsRoutes.post(
  "/listings",
  spec({
    summary:
      "Create a listing: a draft, or sent to review with `submit` (counts against the plan limit)",
    access: "user",
    responses: { 200: listingSchema },
    errors: ["unauthenticated", "banned", "forbidden", "limit_reached"],
    idempotent: true,
  }),
  requireUser,
  validate.json(listingCreateSchema),
  async (c) => {
    const listing = await createListing(c.get("user"), c.req.valid("json"))
    return c.json(listing)
  }
)

listingsRoutes.patch(
  "/listings/:id",
  spec({
    summary:
      "Change a listing (owner or admin); `submit` sends a draft or rejected one to review",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...OWNER_ERRORS, "limit_reached"],
  }),
  requireUser,
  validate.json(listingPatchSchema),
  async (c) => {
    const listing = await patchListing(c.get("user"), {
      id: c.req.param("id"),
      body: c.req.valid("json"),
    })
    return c.json(listing)
  }
)

listingsRoutes.delete(
  "/listings/:id",
  spec({
    summary: "Delete a listing and its photos for good",
    access: "user",
    responses: { 200: okSchema },
    errors: [...OWNER_ERRORS],
  }),
  requireUser,
  async (c) => {
    await deleteListing(c.get("user"), c.req.param("id"))
    return c.json({ ok: true as const })
  }
)

listingsRoutes.post(
  "/listings/:id/status",
  spec({
    summary: "Mark a listing available, reserved, sold or rented",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...OWNER_ERRORS],
  }),
  requireUser,
  validate.json(listingStatusInputSchema),
  async (c) => {
    const listing = await setListingStatus(c.get("user"), {
      id: c.req.param("id"),
      status: c.req.valid("json").status,
    })
    return c.json(listing)
  }
)

listingsRoutes.post(
  "/listings/:id/renew",
  spec({
    summary: "Extend a listing by the expiry setting's days",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...OWNER_ERRORS],
  }),
  requireUser,
  async (c) => {
    const listing = await renewListing(c.get("user"), c.req.param("id"))
    return c.json(listing)
  }
)

listingsRoutes.post(
  "/listings/:id/duplicate",
  spec({
    summary: "Copy a listing, photos included, as a new draft",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...OWNER_ERRORS],
    idempotent: true,
  }),
  requireUser,
  async (c) => {
    const listing = await duplicateListing(c.get("user"), c.req.param("id"))
    return c.json(listing)
  }
)
