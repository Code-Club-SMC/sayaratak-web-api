import {
  seedArchiveInputSchema,
  seedInputSchema,
  seedOperationSchema,
  seedPrepareInputSchema,
  seedRemovalInputSchema,
  seedRetryInputSchema,
  seedStatusSchema,
} from "@sayaratak/shared/schemas/admin-seed"
import { seedPromptPackSchema } from "@sayaratak/shared/schemas/seed-manifest"
import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"

import { fail } from "~/shared/http/errors"
import { rateLimit } from "~/shared/http/rate-limit"
import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import { requireAdmin } from "~/modules/auth/auth.middleware"

import {
  getSeedPromptPack,
  getSeedStatus,
  prepareSeedDataset,
  requestSeedRemoval,
  retrySeedInstall,
  startSeedInstall,
} from "./admin-seed.service"
import { receiveSeedArchive } from "./admin-seed.archives.service"

const ADMIN_ERRORS = ["unauthenticated", "banned", "forbidden"] as const
const PREPARE_BODY_MAX_BYTES = 1024

export const adminSeedRoutes = new Hono()

adminSeedRoutes.post(
  "/admin/seed/archives",
  spec({
    summary: "Receive a bounded private ZIP for durable image validation",
    access: "user",
    rawBody: { mediaType: "application/zip" },
    responses: { 202: seedOperationSchema },
    errors: [...ADMIN_ERRORS, "conflict", "not_found"],
  }),
  requireAdmin,
  rateLimit("adminSeedArchives"),
  validate.query(seedArchiveInputSchema),
  async (c) =>
    c.json(
      await receiveSeedArchive(
        c.get("actor"),
        c.req.valid("query"),
        c.req.raw.body ??
          new ReadableStream({
            start(controller) {
              controller.close()
            },
          })
      ),
      202
    )
)

adminSeedRoutes.get(
  "/admin/seed",
  spec({
    summary: "Admin preview dataset capability and durable progress",
    access: "user",
    responses: { 200: seedStatusSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireAdmin,
  async (c) => c.json(await getSeedStatus())
)

adminSeedRoutes.post(
  "/admin/seed/prepare",
  bodyLimit({
    maxSize: PREPARE_BODY_MAX_BYTES,
    onError: () => fail.validation({ body: "validation.too_long" }),
  }),
  spec({
    summary:
      "Prepare the one versioned preview dataset without publishing data",
    access: "user",
    responses: { 200: seedStatusSchema },
    errors: [...ADMIN_ERRORS, "conflict"],
  }),
  requireAdmin,
  rateLimit("adminSeed"),
  validate.json(seedPrepareInputSchema),
  async (c) => c.json(await prepareSeedDataset(c.get("actor")))
)

adminSeedRoutes.get(
  "/admin/seed/manifest",
  spec({
    summary: "Download the prepared catalog with one prompt per required image",
    access: "user",
    responses: { 200: seedPromptPackSchema },
    errors: [...ADMIN_ERRORS, "not_found", "conflict"],
  }),
  requireAdmin,
  async (c) =>
    c.body(await getSeedPromptPack(), 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="sayaratak-seed-prompts-v1.json"',
    })
)

adminSeedRoutes.post(
  "/admin/seed/remove",
  spec({
    summary: "Confirmed seed-only removal with dependency preservation",
    access: "user",
    responses: { 202: seedOperationSchema },
    errors: [...ADMIN_ERRORS, "conflict", "not_found"],
  }),
  requireAdmin,
  rateLimit("adminSeed"),
  validate.json(seedRemovalInputSchema),
  async (c) =>
    c.json(await requestSeedRemoval(c.get("actor"), c.req.valid("json")), 202)
)

adminSeedRoutes.post(
  "/admin/seed/start",
  spec({
    summary: "Start or queue seed installation for the prepared dataset",
    access: "user",
    responses: { 202: seedOperationSchema },
    errors: [...ADMIN_ERRORS, "conflict", "not_found"],
  }),
  requireAdmin,
  rateLimit("adminSeed"),
  validate.json(seedInputSchema),
  async (c) =>
    c.json(
      await startSeedInstall(
        c.get("actor"),
        c.req.valid("json").manifestDigest
      ),
      202
    )
)

adminSeedRoutes.post(
  "/admin/seed/retry",
  spec({
    summary: "Retry an existing failed seed install without resetting progress",
    access: "user",
    responses: { 202: seedOperationSchema },
    errors: [...ADMIN_ERRORS, "conflict", "not_found"],
  }),
  requireAdmin,
  rateLimit("adminSeed"),
  validate.json(seedRetryInputSchema),
  async (c) =>
    c.json(await retrySeedInstall(c.get("actor"), c.req.valid("json")), 202)
)
