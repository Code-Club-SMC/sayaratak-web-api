import {
  adminListingSchema,
  bulkResultSchema,
} from "@sayaratak/shared/schemas/admin"
import {
  adminListingPatchSchema,
  bulkInputSchema,
  rejectInputSchema,
} from "@sayaratak/shared/schemas/inputs"
import { listingSchema } from "@sayaratak/shared/schemas/listing"
import { pageOf } from "@sayaratak/shared/schemas/fields"
import { type Context, Hono } from "hono"

import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import type { Actor } from "~/modules/audit/audit.types"
import { requireRole } from "~/modules/auth/auth.middleware"

import {
  getAdminListings,
  getModerationQueue,
  moderateListing,
  moderateListings,
  updateListing,
} from "./admin-listings.service"

const ADMIN_ERRORS = ["unauthenticated", "banned", "forbidden"] as const

export const adminListingsRoutes = new Hono()

// The signed-in admin and where they came from, for the audit row.
const actorOf = (c: Context): Actor => ({
  admin: c.get("user"),
  ip: c.get("clientIp"),
})

adminListingsRoutes.get(
  "/admin/moderation",
  spec({
    summary:
      "Pending listings, newest first; filters `type`, `sellerKind` (individual, dealership, verified) and `q`, paged",
    access: "user",
    responses: { 200: pageOf(listingSchema) },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  async (c) => c.json(await getModerationQueue(actorOf(c), c.req.query()))
)

adminListingsRoutes.get(
  "/admin/listings",
  spec({
    summary:
      "Every listing but drafts, newest first; filters `moderation`, `status`, `type`, `sellerKind`, `cityId`, `promoted` (yes, no), `ownerId`, `id` and `q`, paged",
    access: "user",
    responses: { 200: pageOf(adminListingSchema) },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  async (c) => c.json(await getAdminListings(actorOf(c), c.req.query()))
)

adminListingsRoutes.post(
  "/admin/listings/bulk",
  spec({
    summary:
      "Approve, reject, remove or restore many listings; the ones the action does not fit are skipped. Rejecting needs a `reason`",
    access: "user",
    responses: { 200: bulkResultSchema },
    errors: [...ADMIN_ERRORS, "validation"],
  }),
  requireRole("admin"),
  validate.json(bulkInputSchema),
  async (c) => c.json(await moderateListings(actorOf(c), c.req.valid("json")))
)

adminListingsRoutes.post(
  "/admin/listings/:id/reject",
  spec({
    summary:
      "Reject a pending or approved listing with a reason the owner reads",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...ADMIN_ERRORS, "not_found", "conflict", "validation"],
  }),
  requireRole("admin"),
  validate.json(rejectInputSchema),
  async (c) =>
    c.json(
      await moderateListing(actorOf(c), {
        id: c.req.param("id"),
        action: "reject",
        reason: c.req.valid("json").reason,
      })
    )
)

const ACTIONS = {
  approve: "Approve a pending or rejected listing",
  remove: "Remove a listing that is not removed yet",
  restore: "Restore a removed listing as approved",
} as const

for (const [action, summary] of Object.entries(ACTIONS) as [
  keyof typeof ACTIONS,
  string,
][])
  adminListingsRoutes.post(
    `/admin/listings/:id/${action}`,
    spec({
      summary,
      access: "user",
      responses: { 200: listingSchema },
      errors: [...ADMIN_ERRORS, "not_found", "conflict"],
    }),
    requireRole("admin"),
    async (c) =>
      c.json(
        await moderateListing(actorOf(c), { id: c.req.param("id"), action })
      )
  )

adminListingsRoutes.patch(
  "/admin/listings/:id",
  spec({
    summary:
      "Set a listing's sale state (`status`); any other field answers 422",
    access: "user",
    responses: { 200: listingSchema },
    errors: [...ADMIN_ERRORS, "not_found", "validation"],
  }),
  requireRole("admin"),
  validate.json(adminListingPatchSchema),
  async (c) =>
    c.json(
      await updateListing(actorOf(c), {
        id: c.req.param("id"),
        patch: c.req.valid("json"),
      })
    )
)
