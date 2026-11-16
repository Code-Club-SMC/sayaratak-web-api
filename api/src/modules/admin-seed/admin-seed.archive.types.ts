import { z } from "zod"

import {
  seedArchiveRejectionSchema,
  seedDigestSchema,
} from "@sayaratak/shared/schemas/admin-seed"

export const validatedArchiveEntrySchema = z.object({
  assetId: z.string().min(1),
  filename: z.string().min(1),
  generation: z.number().int().positive(),
  digest: seedDigestSchema,
  bytes: z
    .number()
    .int()
    .min(1)
    .max(2 * 1024 * 1024),
  width: z.number().int().min(1200).max(4096),
  height: z.number().int().min(900).max(3072),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
})

// The archive remains immutable in R2. Entries are ordered by central-directory order.
// No entry is accepted until Task 4 commits every stored generation together.
export const archiveCheckpointSchema = z.object({
  archiveKey: z.string().startsWith("admin-seed/"),
  archiveDigest: seedDigestSchema,
  archiveBytes: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024),
  replaceGenerations: z.array(
    z.object({
      assetId: z.string().min(1),
      generation: z.number().int().positive(),
    })
  ),
  entries: z.array(validatedArchiveEntrySchema).max(50),
  rejections: z.array(seedArchiveRejectionSchema).max(50).default([]),
})

export type ArchiveCheckpoint = z.infer<typeof archiveCheckpointSchema>
export type ValidatedArchiveEntry = z.infer<typeof validatedArchiveEntrySchema>
