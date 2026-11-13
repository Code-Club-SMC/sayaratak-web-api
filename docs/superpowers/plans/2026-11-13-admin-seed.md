# Admin-managed demo dataset implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or execute inline task-by-task with this plan and recorded checkpoints. Do not spawn agents until the owner selects that execution mode. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a stepped-up admin prepare 460 prompted images, install 200 fictional listings and 30 businesses with durable progress, and remove only owned seeded data.

**Architecture:** A dedicated admin-seed module owns versioned manifests, upload intents, operation checkpoints, and exact provenance. The existing scheduler executes bounded passes through domain services; PostgreSQL is authoritative, private R2 holds uploaded archives, and Cloudinary holds validated images. Public capability metadata blocks interactions, supports a small notice, and excludes synthetic offers from search indexing.

**Tech stack:** Bun 1.4.2, Hono, PostgreSQL 18, Drizzle, shared Zod schemas, Better Auth 1.7.10, Cloudinary, existing R2 adapter, TanStack Start/Query, React, installed shadcn/Base UI primitives. Proposed additions are yauzl 3.4.0, sharp 0.35.5, and development-only @types/yauzl 3.4.0.

**Spec:** `docs/superpowers/specs/2026-11-13-admin-seed-design.md`, approved by owner on 2026-11-13.

## Global constraints

- Counts: 100 cars, 20 trucks, 20 motorcycles, 10 tuk-tuks, 25 parts, 25 rentals; 10 dealerships, 10 workshops, 10 mechanics; two images each, 460 images total.
- Content is deterministic and versioned, with Arabic/English descriptions and names where supported by the existing schemas.
- Prices are whole SDG pounds.
- No fabricated reviews, ratings, views, leads, messages, payments, subscriptions, verification badges, or paid-promotion claims.
- No deployment, live data writes, image generation API integration, or full-database restore is included in this implementation authorization.
- Existing development/test seed behavior and its production refusal remain unchanged.
- Use one small inline sentence in the shared public layout, not a prominent banner, modal, popup, sticky layer, or individual-listing badge.
- Do not make it dismissible or hide it from assistive technology.
- All 460 required assets must pass validation before Seed data is enabled.
- Proposed upload limits are 25 MiB compressed, 100 MiB expanded, 50 images per archive, and 2 MiB per image. Treat these as the reviewed implementation limits.
- Accept only decoded JPEG/PNG/WebP, 4:3, minimum 1200×900, maximum 4096×3072; recommend 1600×1200.
- Percentages reflect committed stage units; 100% requires stage completion.
- No real account, listing, business, activity, reference data, or media may be overwritten or cascaded away.
- Preserve import boundaries, <=200-line backend/shared files, <=40-line functions, <=3 parameters, named exports, and bilingual i18n keys.
- No new queue service. No new paid storage resource. Reuse configured private R2 in an isolated namespace.
- Use Bun/Podman only. Run heavy gates sequentially. Stop only temporary resources started for these tasks; preserve owner processes.
- Every task records progress in both trackers and ends with passing applicable gates and one `step 11.6-seed-N: ...` commit.

## Existing behavior that the implementation must account for

1. `api/scripts/seed.ts` imports frontend mocks and creates credential accounts, social/billing fixtures, and demo files. It is not an implementation dependency.
2. `requireAdmin` plus the global session middleware enforces admin email step-up and rejects admin bearer use. Keep that policy.
3. Existing listing IDs must match `^l[0-9a-z]{5}$`; slugs use their trailing ID. Do not introduce arbitrary seed prefixes into listing IDs.
4. A dealership is the only business role that can own listing inventory. Workshop/mechanic owners do not become dealership owners.
5. Listing contact currently requires a phone and at least one method. Introduce a distinct withheld-contact wire shape rather than inventing a dialable number.
6. `/site` currently has a 60-second public cache; `siteQuery` has five-minute staleness. A notice driven only by that query is unsafe.
7. `FileStore.put` currently chooses provider IDs. Recovery needs a persisted immutable upload intent and deterministic object ID before external upload.
8. Upload rows have a retryable host-deletion outbox and shared-Cloudinary-ID protection. Reuse these, do not create a second independent deletion queue.
9. Unattached uploads are collected after 24 hours. Staged seed assets require an explicit reservation so a lengthy generation/upload workflow does not lose them.
10. R2 currently exports a backup-oriented adapter with a temporary-disk fake. Public hosted seeding must not silently use that fake.
11. `existingSignUp` deletes unfinished accounts. Synthetic owners need an explicit guard before that deletion path, not just no password.
12. Existing account/business deletion cascades erase real reviews/messages. Seed removal cannot call those deletion flows.

## File and ownership map

Create these units, splitting only by the existing module filename rules:

| Unit | Files and responsibility |
| --- | --- |
| Shared contracts | `packages/shared/src/schemas/admin-seed.ts` for status/input/output; `seed-manifest.ts` for versioned records/assets; `interaction.ts` for public action mode and withheld contact |
| Manifest content | `api/src/modules/admin-seed/admin-seed.catalog.service.ts`, `.vehicles.service.ts`, `.parts.service.ts`, `.businesses.service.ts`, `.prompts.service.ts`: deterministic typed content, no database writes |
| Admin operation core | `admin-seed.tables.ts`, `.queries.ts`, `.operations.queries.ts`, `.assets.queries.ts`, `.mapper.ts`, `.service.ts`, `.routes.ts` |
| Image work | `admin-seed.archives.service.ts`, `.validation.service.ts`, `.media.service.ts`, `.work.service.ts`, `.storage.queries.ts` |
| Seed/removal work | `admin-seed.install.service.ts`, `.removal.service.ts`, `.references.service.ts`; the orchestrator calls domain services only |
| Generic byte validation | `api/src/shared/files/zip.ts`, `image-check.ts` and tests; neither imports feature modules |
| Storage | `api/src/shared/storage/seed-archives.ts`; isolate allowed keys from backup objects; reuse/refactor private R2 transport without changing backup behavior |
| Domain ownership | Add `<domain>.seed.service.ts`/`.seed.queries.ts` in auth, listings, businesses, uploads; reference-inspection services in dependent modules |
| Scheduler | `api/src/jobs/admin-seed.job.ts`, registration in `api/src/jobs/index.ts` |
| Admin web | `web/src/features/admin-seed/{queries.ts,progress.ts,components/*}`; mount in site settings |
| Public web | `web/src/components/app/seed-notice.tsx`, explicit interaction-mode props in existing controls, existing detail loaders/SEO and JSON-LD |
| Tests/docs | Focused API module tests, web tests, `web/e2e/admin-seed.spec.ts`, `api/docs/ADMIN_SEED.md`, prompt-pack download instructions |

Backend file names in the table are relative to the admin-seed module unless explicitly absolute. Do not add miscellaneous helpers in module folders. New service/queries/types/mapper splits retain the module prefix.

## State and transaction contracts

### Dataset and operation state

- Dataset states: `preparing`, `ready`, `seeding`, `installed`, `removing`, `removed`, `retained`.
- Operation kinds: `archive`, `seed`, `remove`.
- Operation states: `receiving`, `queued`, `running`, `failed`, `completed`.
- Stages: `upload`, `validate`, `store-images`, `insert-businesses`, `insert-listings`, `hide`, `remove-records`, `remove-media`, `complete`.
- Removal outcome: `removed` or `retained`; pending media cleanup is not completed.
- A failed operation keeps its checkpoint, dataset lock slot, sanitized error code, and stage. Retry changes that operation back to `queued`, not a new run with zero progress.
- A failed partial seed may transition to removal. A receiving/queued/running archive or running seed cannot race removal.
- A permanently invalid failed archive may be superseded by a corrected upload. In one transaction, release the failed operation's active slot, link its replacement, and reserve the new operation. The same atomic transfer allows confirmed removal to supersede a failed seed. Retrying a superseded operation is 409.
- Removed datasets keep audit/provenance tombstones. Retained datasets cannot be silently reinstalled over archived records.

### Persistent tables

Create `seed_datasets`, `seed_operations`, `seed_assets`, `seed_records`, and `seed_storage_intents`.

- Dataset: version, resolved-manifest JSON, SHA-256 digest, creation anchor time, creator ID nullable on account deletion, state, retained summary, timestamps.
- Operation: dataset FK, kind/state/stage, actor snapshot suitable for audit, stage counters, immutable total counters, checkpoint JSON, safe failure code, timestamps.
- Operation slot: nullable true-only `activeSlot` with a unique partial index, plus nullable `supersededBy`. Completed or superseded operations release the slot; a failed unsuperseded operation retains it until retry, corrected archive, or confirmed removal.
- Asset: dataset/asset key uniqueness, generation number, expected filename, input digest/bytes/dimensions/MIME, operation ID, staged provider/upload IDs, accepted generation, validation state.
- Record: dataset/domain/stable-ID uniqueness, canonical record digest, deletion/retention outcome; supporting owners and upload rows included.
- Storage intent: immutable namespace/key, operation and asset generation, digest, purpose, pending/stored/delete-pending/deleted state. Reserve before any external write.

Add a singleton partial-unique active slot to unfinished operations, including failures, so two processes cannot start competing work. Add a singleton live-dataset slot excluding only `removed`. `preparing` consumes that dataset slot too. Store `0 <= completed <= total` checks; counters must never increase from attempted work.

Add internal `seedDatasetId` and `seedHidden` columns to listings and all three business tables; add internal `seedDatasetId` to auth users and uploads. Defaults preserve real data. Do not import admin-seed tables into domain tables or create service import cycles: the orchestrator validates domain/provenance ownership transactionally.

### Lock order

Use dataset row, operation row, synthetic owner IDs sorted, public record IDs sorted, upload IDs sorted. Mutation guards take the relevant domain row lock before accepting new dependencies; seed orchestration uses the same order. Do not hold a database transaction open across Cloudinary/R2 calls.

### Shared types

All public/admin types are inferred from Zod. Define:

- `SeedManifest`: version, ordered 230 records, ordered 460 asset specifications, stable synthetic-owner descriptors, taxonomy references. It contains no password, token, usable email recipient, or real contact number.
- `SeedProgress`: stage, completed, total, percent. Zero-total stages show null percentage until resolved; completed zero-work stages show 100.
- `SeedOperation`: id, kind, state, progress, committed image/business/listing counts, retained counts, safe errors, timestamps.
- `SeedStatus`: capability enabled/missing names, nullable dataset summary, nullable current operation, accepted/missing/rejected asset counts.
- `SeedInput`: manifest digest and confirmation literal; the client never supplies arbitrary seed content.
- `SeedArchiveInput`: expected archive SHA-256, manifest digest, explicit replace-generation list. ZIP bytes are a separate bounded raw request stream, not a parsed multipart File.
- `SeedRemovalInput`: dataset ID, observed manifest digest, confirmation literal.
- `SeedRetryInput`: operation ID and observed manifest digest.
- `InteractionMode`: `live` or `preview`; default `live` when parsing older cached/mock payloads.
- A preview listing contact is exactly `{ phone: null, whatsapp: null, showPhone: false, methods: [] }`. Normal create/edit input rules remain unchanged.

Define domain-specific batch schemas alongside the manifest and infer these exports:

- `SeedOwnerBatch`: dataset ID, manifest digest, preparation anchor ISO date, ordered synthetic-owner descriptors.
- `SeedBusinessBatch`: dataset ID, manifest digest, anchor, ordered business records and exact accepted upload-ID bindings.
- `SeedListingBatch`: dataset ID, manifest digest, anchor, ordered listing records and exact accepted upload-ID bindings.
- `SeedImageIntent`: dataset/operation/asset/generation identifiers, input and normalized digests, immutable provider key, validated bytes and MIME. Keep byte-containing input as a backend `admin-seed.types.ts`/uploads types export, not a client response.
- `SeedStoredImage`: exact immutable provider key, upload ID, input dimensions, provider dimensions and digest.
- `SeedReferenceScope`: ordered owned user/listing/business/upload/provider IDs.
- `SeedReference`: referencing domain and record ID, referenced domain and record ID, preservation reason key.
- `SeedRemovalScope`: dataset ID, manifest digest, ordered owned IDs, ordered protected IDs.
- `SeedRemovalResult`: deleted IDs, already-missing IDs, retained IDs/reasons, pending owned storage intents.
- `SeedCleanupStatus`: pending/failed/deleted owned object counts and safe error keys.
- `SeedArchive`: the generic adapter interface from Task 3. `SeedArchiveEntry`: logical filename, compressed/expanded sizes, CRC-32, validated external attributes and a bounded byte reader.
- `CheckedSeedImage`: MIME limited to JPEG/PNG/WebP, decoded width/height, byte count, SHA-256.

Do not expose raw bytes, internal provider keys, owner identities or preservation reference IDs in public contracts. Client-visible summaries return safe counts/reason keys only.

### Endpoints

All are `/api/v1/admin/seed`, use `spec()`, `requireAdmin`, and validated shared inputs:

| Method/path | Result |
| --- | --- |
| GET `/admin/seed` | 200 `SeedStatus`; capability explanation even when disabled |
| POST `/admin/seed/prepare` | 200 idempotently prepares/resolves the one versioned manifest |
| GET `/admin/seed/manifest` | 200 JSON prompt pack as an attachment; contains all per-image prompts and exact filenames |
| POST `/admin/seed/archives` | 202 durable archive operation after bounded R2 upload; metadata from validated query fields, raw ZIP body |
| POST `/admin/seed/start` | 202 durable seed operation, or the existing equivalent operation |
| POST `/admin/seed/retry` | 202 same failed operation reset to queued |
| POST `/admin/seed/remove` | 202 operation after atomic hiding, or the existing equivalent removal |

409 identifies digest mismatch, busy operation, incompatible generation, or collision. 422 identifies input/asset validation errors. 403 keeps admin/step-up policy. Missing runtime capability is a typed unavailable response, never successful fake persistence. Body limits run before buffering; the archive route does not enable generic body-hashing idempotency middleware. It authenticates, validates small metadata, reserves the database admission slot, and only then consumes the ZIP stream. GET prompt/status responses are private/no-store.

## Task 1: Deterministic manifest and complete prompt pack

**Files**
- Create shared `seed-manifest.ts`, `interaction.ts`, `admin-seed.ts`.
- Create admin-seed catalog/vehicles/parts/businesses/prompts service files and `admin-seed.manifest.test.ts`.
- Create `api/scripts/seed-prompt-pack.ts`, `api/docs/ADMIN_SEED.md`.
- Modify `api/package.json` with a prompt-pack export command, not the old db seed command.
- Modify `api/plan/implementation.md` 11.6 and `web/plan/implementation.md` 14.13 with this supplement link before feature edits.

**Interfaces**
- Produces `buildSeedManifest(): SeedManifest`, `getManifestDigest(manifest: SeedManifest): string`.
- Produces `renderSeedPromptPack(manifest: SeedManifest): string`, serializing manifest plus individual image prompts as one JSON attachment.
- Task 2 resolves catalog taxonomy references against actual taxonomy through its existing services; it does not modify the catalog or silently substitute makes/models.

- [ ] Write this failing manifest regression and add distinct assertions for 100/20/20/10/25/25 listing groups and 10 businesses per role:

```ts
import { expect, test } from "bun:test"
import { buildSeedManifest, getManifestDigest } from "./admin-seed.catalog.service"

test("the prompt pack is deterministic and covers every required image", () => {
  const first = buildSeedManifest()
  const second = buildSeedManifest()
  expect(first.records).toHaveLength(230)
  expect(first.assets).toHaveLength(460)
  expect(new Set(first.assets.map((asset) => asset.filename)).size).toBe(460)
  expect(getManifestDigest(first)).toBe(getManifestDigest(second))
  for (const record of first.records) {
    expect(first.assets.filter((asset) => asset.recordId === record.id)).toHaveLength(2)
  }
})
```

- [ ] Run `bun test --cwd api --timeout 120000 src/modules/admin-seed/admin-seed.manifest.test.ts`; capture failure before implementation.
- [ ] Implement a curated, typed descriptor catalog, with varied valid year/configuration combinations and complete bilingual text. Use stable IDs satisfying actual domain constraints; detect all generated-ID collisions before returning.
- [ ] Use only catalog data to generate prompts. For each vehicle, image 1 is exterior three-quarter; image 2 is matching side/rear with the same reference identity. Parts use complete item/detail; dealerships use premises/interior; workshops use exterior/work bay; mechanics use a fictional portrait/workplace. Maintain two landscape assets per record.
- [ ] The second prompt explicitly instructs the owner's model to use the first image as a reference. Do not claim prompts guarantee visual consistency; include an admin review checklist before upload.
- [ ] Export a canonical JPEG filename and the exact allowed PNG/WebP alternative filenames for each logical asset in the pack. Task 3 rejects multiple extensions for one logical asset.
- [ ] Keep timestamps anchored at dataset preparation, not varying with every build. Derive no fake views or paid status. Assign vehicle/parts inventory only to the ten synthetic dealership owners; the other twenty owners have their own business roles.
- [ ] Add safe CLI export that reads no credentials/database and writes only the named output file. Include instructions for at least ten ZIP batches of at most 50 images; split further whenever the actual compressed size would exceed 25 MiB.
- [ ] Run focused test and shared/API typecheck/lint/format. Record progress; commit `step 11.6-seed-1: define catalog and image prompts`.

## Task 2: Durable dataset state, ownership, and admin boundary

**Files**
- Create admin-seed tables/queries/operations/assets/mapper/service/routes and `admin-seed.access.test.ts`, `admin-seed.state.test.ts`.
- Modify `api/src/app.ts`, `api/src/shared/db/schema.ts`, `api/src/env.ts`, `.env.example`, and `env.test.ts`.
- Modify auth/listings/businesses/uploads tables for internal provenance columns.
- Create the generated additive migration via `bun run --cwd api db:generate`; include its generated SQL/snapshot/journal. Do not guess a migration number.
- Modify `api/src/shared/http/rate-limit.ts` for admin seed mutation/archive ceilings.

**Interfaces**
- `getSeedStatus(): Promise<SeedStatus>`.
- `prepareSeedDataset(actor: Actor): Promise<SeedStatus>`.
- `getSeedPromptPack(): Promise<SeedManifest>`.
- `startSeed(actor: Actor, input: SeedInput): Promise<SeedOperation>`.
- `retrySeedOperation(actor: Actor, input: SeedRetryInput): Promise<SeedOperation>`.
- `requestSeedRemoval(actor: Actor, input: SeedRemovalInput): Promise<SeedOperation>`, implemented fully in Task 6 before its route is enabled.
- Routes not yet implemented in dependent tasks are not registered as successful stubs.

- [ ] Add request-level failures for anonymous, regular user, admin before email step-up, admin bearer, disabled capability, digest mismatch, and two concurrent prepare requests.
- [ ] Use existing test helpers; this access regression must pass without seed capability or image storage:

```ts
import { expect, test } from "bun:test"
import { req } from "../../../tests/helpers"

test("anonymous callers cannot inspect the seed manifest", async () => {
  const response = await req("/admin/seed/manifest")
  expect(response.status).toBe(401)
})
```

- [ ] Capture red tests, then add the tables/checks/indexes and only prepare/status/manifest routes. Add `ADMIN_SEED_ENABLED` parsed as a boolean with default false; do not make `APP_ENV=development` an implicit production safety bypass.
- [ ] Non-test runtime requires the enable flag and actual Cloudinary plus all four R2 credentials. Status lists missing capability names without values. Test mode uses the existing fake file/storage boundaries, not mocks of feature services.
- [ ] Serialize prepare with a transaction-scoped advisory lock and the live-dataset index, so an empty table still has a concurrency guard. Verify resolved taxonomy exists and belongs to the required types before storing the manifest/digest.
- [ ] Add admin-seed user limit 30 mutations/hour and 20 archives/hour; preserve all existing rate limits. Database operation slots remain the cross-instance concurrency limit.
- [ ] Add audit entries transactionally for prepare/start/retry/hide/remove and system checkpoints/failures. An actor deleted after enqueue must not erase operations or fabricate an active admin session for the job.
- [ ] Verify migration defaults preserve all existing rows and existing catalog/bootstrap tests pass. Verify every orphan/provenance FK deletion rule preserves tombstones.
- [ ] Regenerate OpenAPI; run static/focused access/state/env/migration gates, update trackers, commit `step 11.6-seed-2: persist admin seed operations`.

## Task 3: Bounded ZIP intake and full image validation

**Files**
- Modify `api/package.json`, `bun.lock`; propose additions under the A6 deviation log before installation.
- Create shared files `zip.ts`, `zip.test.ts`, `image-check.ts`, `image-check.test.ts`.
- Create `api/src/shared/storage/seed-archives.ts` and tests; extract reusable R2 transport into `api/src/shared/storage/private-objects.ts`, preserving `BackupStore` and its existing public interface.
- Create admin-seed archives/validation/storage queries and archive request/validation tests.
- Modify admin-seed routes/service contracts, `api/Dockerfile` only if native decoder packaging demonstrably requires it.

**Interfaces**
- `openSeedArchive(bytes: Uint8Array<ArrayBuffer>): Promise<SeedArchive>`.
- `SeedArchive` provides lazy `entries(): AsyncIterable<SeedArchiveEntry>` and `close(): void`; each entry exposes validated metadata and `read(): Promise<Uint8Array<ArrayBuffer>>` capped at 2 MiB.
- `checkSeedImage(bytes: Uint8Array<ArrayBuffer>): Promise<CheckedSeedImage>` returns sniffed image MIME, width, height, byte count, and SHA-256; it performs an actual full decode.
- `receiveSeedArchive(actor: Actor, input: SeedArchiveInput, source: ReadableStream<Uint8Array>): Promise<SeedOperation>`.
- `processSeedArchiveValidation(operationId: string): Promise<number>` handles at most five entries per pass.
- `seedArchives.put/download/remove` use only server-constructed `admin-seed/` keys, never arbitrary client paths.

- [ ] Add real corrupt/traversal/duplicate/encrypted/symlink/oversize ZIP fixtures and valid JPEG/PNG/WebP image fixtures. Unit tests use actual parsers/decoders, never fake validation results.
- [ ] Capture red failures; after owner acceptance of the dependency proposal install with Bun: `bun add --cwd api --exact yauzl@3.4.0 sharp@0.35.5`, then `bun add --cwd api --dev --exact @types/yauzl@3.4.0`.
- [ ] Use verified yauzl callback APIs (`fromBuffer`, `readEntry`, `openReadStream`) with `lazyEntries`, `strictFileNames`, `decodeStrings`, `validateEntrySizes` true. Register error listeners and close/destroy streams in every exit path.
- [ ] Check central-directory entry count/metadata before inflating anything; reject encryption, Unix symlink modes, directory entries, nonmanifest names, nested paths, unsupported methods, duplicate logical IDs and unsupported archive structure. Support normal stored/deflated ZIP only.
- [ ] Count actual decompressed bytes in stream consumers; stop at 2 MiB per file or 100 MiB overall even if metadata lies. Compare `Bun.hash.crc32(bytes)` against each entry's central-directory CRC-32. Verified on installed Bun 1.4.2: `"123456789"` returns 3421780262. No additional CRC dependency.
- [ ] Implement full decode with the verified sharp API, failOn warning, input pixel ceiling 4096×3072, one decode at a time, and an explicit small cache. Read metadata first, require JPEG/PNG/WebP and one frame, require `width * 3 === height * 4`, then decode pixels with `.raw().toBuffer()` and discard them before the next image.
- [ ] Example regression for the real decoder:

```ts
import { expect, test } from "bun:test"
import { checkSeedImage } from "./image-check"

test("a JPEG signature without decodable pixels is rejected", async () => {
  const truncated = Uint8Array.from([255, 216, 255, 224, 0, 16])
  await expect(checkSeedImage(truncated)).rejects.toThrow()
})
```

- [ ] Enforce byte limits before buffering. Authenticate and validate query metadata without reading the body, then reserve the sole receiving-operation slot before consuming it. Stream into private R2 while counting/hashing bytes, enforce a 120-second intake deadline, verify actual byte count/digest, then transition to queued. A concurrent request receives 409 before its archive is consumed. A client disconnect or failed upload leaves no queued partial archive.
- [ ] Use R2 as durable authority; any local scratch is private, <=25 MiB, disposable and rebuilt from R2, under `/tmp/opencode` locally. Never depend on the fake/temp store outside test mode. Do not expose stored archives or arbitrary signed download URLs publicly.
- [ ] Validation may checkpoint valid entries, but cannot publish any accepted-generation mapping until the entire archive passes validation and media storage. Failure leaves previously accepted files unchanged; retry uses the immutable R2 object.
- [ ] Add a receiving-operation timeout based on the operation timestamp; mark abandoned receiving operations failed, clean their exact storage intent, and allow explicit retry/reupload. Do not indefinitely block the singleton slot.
- [ ] Hash replay against the immutable expected archive digest. A completed accepted archive returns its prior result; a failed invalid archive with a different digest can be explicitly superseded without changing accepted asset mappings. Protect this slot transfer with the same dataset lock as seed/removal.
- [ ] Run frozen install/audit, static tests, ZIP/decode resource-bound tests and a Podman production-image import/decode check under Bun 1.4.2. Do not weaken limits to make native packaging pass. Commit `step 11.6-seed-3: validate staged image archives`.

## Task 4: Recoverable media storage and archive acceptance

**Files**
- Create admin-seed media/work service and `admin-seed.media.test.ts`.
- Create uploads seed service/queries/tests.
- Modify `api/src/shared/files/store.ts`, `cloudinary.ts`, `fake.ts` and provider tests.
- Modify uploads orphan selection/reservation predicates so accepted/staged seed files are not collected prematurely.
- Create `api/src/jobs/admin-seed.job.ts`, register it, add job tests.

**Interfaces**
- Extend `PutFile` with optional `immutableKey: string`; normal uploads retain current behavior.
- `storeSeedImage(input: SeedImageIntent): Promise<SeedStoredImage>` in uploads seed service, with no open database transaction during upload.
- `processSeedMedia(operationId: string): Promise<number>`, up to five images per pass.
- `runSeedPass(): Promise<number>` dispatches current operation stage; only registered implemented stages can be queued.
- `acceptSeedArchive(operationId: string): Promise<void>` atomically swaps all validated/stored asset generations and completes the archive operation.

- [ ] Add a file-boundary test that loses an acknowledgment after a successful provider put, reruns the same immutable intent, and observes one provider key and one accepted asset generation.
- [ ] Persist exact expected provider key and digest before calling `files.put`. Build it only from dataset/operation/asset generation/content digest in a reserved seed namespace.
- [ ] In Cloudinary, use a deterministic public ID for immutableKey and idempotently rewrite only identical intended bytes. Never accept a user-supplied provider ID. Preserve default folder/transform behavior for normal uploads. Match returned key against the intent before accepting it.
- [ ] In fakeStore implement the same stable-key semantics and test them; do not globally change FAKE_SIZE or unrelated existing upload expectations. Input dimensions come from real decoder checks, provider output dimensions remain separate because Cloudinary limits originals.
- [ ] Store/persist uploads through uploads-domain service. Register explicit reservations and exact references. Accepted assets may remain prepared for days; generic 24-hour orphan cleanup must exclude reserved seed assets.
- [ ] Reuse `file_deletions` and existing `retryHostDeletes` for superseded/rejected staged image cleanup. Leave storage intents recoverable across the crash window between successful upload and row creation.
- [ ] Commit all asset-generation swaps only once the whole archive is validated and stored. Retry after final commit returns its completed result. Replacements require explicit confirmation before seed and never mutate a frozen seed manifest.
- [ ] Example idempotent fake-store test:

```ts
import { expect, test } from "bun:test"
import { fakeStore } from "~/shared/files/fake"
import type { PutFile } from "~/shared/files/store"

test("an immutable seed upload has one provider identity", async () => {
  const store = fakeStore()
  const file: PutFile = {
    bytes: Uint8Array.from([1, 2, 3]),
    mime: "image/jpeg",
    delivery: "public",
    folder: "seed/test",
    immutableKey: "asset-01-content-digest",
  }
  const first = await store.put(file)
  const second = await store.put(file)
  expect(second.publicId).toBe(first.publicId)
  expect(store.saved.size).toBe(1)
})
```

- [ ] Register a once-per-minute job through `defineJob` and `runJob`, preserving advisory-lock and shutdown tracking. Process at most five media items per tick; show queued state honestly. No invisible API fire-and-forget worker.
- [ ] Add stale-object deletion recovery and scratch cleanup. Delete original archives only when no stage needs them; retain safe digest/checkpoint metadata.
- [ ] If existing bucket lifecycle expires an incomplete archive, report an expired-source error and require reupload of the same verified digest before resuming. Do not delete already accepted images or silently change the dataset. Document the existing bucket retention without modifying provider lifecycle configuration.
- [ ] Run media/provider/orphan/job/backups regression and static gates; update graph/trackers; commit `step 11.6-seed-4: store images with resumable checkpoints`.

## Task 5: Safe installation, auth isolation, and public API restrictions

**Files**
- Create admin-seed install/references service, install/concurrency/restart tests.
- Create auth/listings/businesses seed service/queries and corresponding tests.
- Modify auth guard/mail/config/service/account-query paths; keep internal field server-only.
- Modify listing mapper/read/filter/search/similar/map/inventory/sitemap paths, business profile/directory/map/sitemap paths and their mappers.
- Modify favorites, messaging threads/messages, reviews, reports, analytics, promotions, payments checkout/submit/item, ads target services where they accept seeded targets or synthetic owners.
- Modify shared listing/profile/map/site contracts; modify `api/src/modules/content/content.service.ts` and `.routes.ts`.
- Modify affected web contact/phone consumers for nullable preview contact and add baseline interaction-mode guards with bilingual explanation text in this same task. Do not leave frontend typecheck failing until Task 7. Task 7 completes the shared notice, admin workflow and comprehensive browser assertions.

**Interfaces**
- `insertSeedOwners(tx: Transaction, input: SeedOwnerBatch): Promise<string[]>`.
- `insertSeedBusinesses(tx: Transaction, input: SeedBusinessBatch): Promise<string[]>`.
- `insertSeedListings(tx: Transaction, input: SeedListingBatch): Promise<string[]>`.
- `lockListingInteraction(ex: Executor, id: string): Promise<InteractionMode>`.
- `lockBusinessInteraction(ex: Executor, id: string): Promise<InteractionMode>`.
- `isSyntheticUser(ex: Executor, id: string): Promise<boolean>`.
- `hasPublicSeedContent(ex: Executor): Promise<boolean>` through listings/businesses services, composed in content service without importing admin-seed.
- `processSeedInstall(operationId: string): Promise<number>`, max 25 public records per pass.

- [ ] Capture red tests for missing images, wrong digest, ID collision, two starts, durable restart, protected real rows, and same-transaction counter/provenance insertion.
- [ ] Seed start locks dataset/operation, verifies all 460 accepted assets and fixed digest, freezes generations, queues once. Two equivalent start calls return one operation; incompatible active work is 409.
- [ ] Insert 30 synthetic owners with reserved `.invalid` identities, no passwords/accounts/sessions/tokens, verified flags false and outgoing notification preferences false. Do not ban owners to enforce auth: a ban would also hide the intended public content.
- [ ] Guard synthetic identities before `existingSignUp` can delete them; block email/password reset/OTP/mail, account linking, OAuth session creation and session loading. Use installed Better Auth APIs/hooks verified in its source. Reject synthetic sessions even if a token is introduced in a regression fixture.
- [ ] Install business batches before listing batches, attach only exact reserved image generations, validate live taxonomy again, and update provenance/checkpoint/counts in the same transaction. Collision with an unowned existing ID or slug aborts the batch without overwrites. Stable owned replay skips only after digest/ownership verification.
- [ ] Add internal visibility filtering to every public read, including direct detail, rails, similar, facets, counts, maps, business inventory, and sitemap. Preview assets must not become valid attachments for real users.
- [ ] Add `interactionMode` to public listing/business/map outputs and `demoActive` to site. Keep synthetic IDs/provenance private. Return preview listing contact with null phone/WhatsApp, false showPhone, empty methods; return empty business phones and null WhatsApp. Normal create/edit forms still require real valid contact.
- [ ] Update every compile-time affected frontend consumer and test fixture immediately: preview contact controls render an accessible unavailable reason, never `tel:null` or WhatsApp/message links. Add default live mode only at compatible wire parsing boundaries, not as a fallback when a parsed preview response is missing a field. Run web typecheck/focused contact/schema tests in this task alongside backend gates.
- [ ] Block new user-owned dependencies and synthetic-owner changes in server domain services under locks: favorites, first/reply messages, reviews, reports, promotional/billing/advertising targets and owner-assignment/grant actions. Existing real dependent activity remains readable/removable. Ignore click/view analytics for preview targets so no fabricated-looking counters or uncontrolled new dependencies appear.
- [ ] No marketplace purchase endpoint is invented: protect only actual checkout/payment paths that can target synthetic owners/records.
- [ ] This request regression must pass after a seeded fixture exists:

```ts
import { expect, test } from "bun:test"
import { call, signIn } from "../../../tests/helpers"
import { seedPreviewFixture } from "../../../tests/admin-seed"

test("a signed-in user cannot save a preview listing", async () => {
  const { listingId } = await seedPreviewFixture()
  const viewer = await signIn("user")
  const response = await call(viewer, "/favorites", {
    method: "POST",
    body: { listingId },
  })
  expect(response.status).toBe(403)
})
```

- [ ] Create `api/tests/admin-seed.ts` in this task: `seedPreviewFixture(): Promise<{ listingId: string; businessId: string; datasetId: string }>` selects one business and one listing from the real manifest, installs them with their real domain seed services and registers exact provenance using the prepared dataset. Use real image validation and fake external storage only. This is a test fixture builder, not a mock or runtime manifest override. Add a separate full-count orchestration integration test. HTTP input cannot replace the normal 230/460 manifest.
- [ ] Remove `publicCache` from `/site`; return no-store. Keep `/pages`, plans and taxonomy cache policy unchanged. Site demo state comes from visible seeded domain rows, not an editable flag.
- [ ] Regenerate OpenAPI; update compatibility tests/mocks only where additive mode fields or withheld contact require them. Run affected auth/security/domain/map/sitemap/content tests and static gates. Commit `step 11.6-seed-5: install isolated public preview data`.

## Task 6: Confirmed seed-only removal with dependency preservation

**Files**
- Implement admin-seed removal/references service and removal/concurrency tests.
- Create `listings.seed-removal.service.ts`/`.queries.ts`, `businesses.seed-removal.service.ts`/`.queries.ts`, `auth.seed-removal.service.ts`/`.queries.ts` and `uploads.seed-removal.service.ts`/`.queries.ts` in their respective modules.
- Add `<domain>.seed-references.service.ts`/`.queries.ts` in favorites, messaging, reviews, reports, payments, promotions, plans, ads, analytics, notifications, verification, devices and saved-searches. Each inspects that domain's real incoming references; no cross-module table imports.
- Modify existing uploads deletion-outbox query/service only to expose per-intent completion status, preserving current callers.
- Enable removal route only with this complete implementation.

**Interfaces**
- `hideSeedRecords(tx: Transaction, datasetId: string): Promise<number>` in listing/business services separately.
- `getSeedReferences(tx: Transaction, scope: SeedReferenceScope): Promise<SeedReference[]>` per dependency-owning domain. Each query touches only its own tables.
- `removeSeedRecords(tx: Transaction, scope: SeedRemovalScope): Promise<SeedRemovalResult>` per owning domain; scope contains verified owned IDs and protected IDs, not a client filter.
- `processSeedRemoval(operationId: string): Promise<number>` handles <=25 public records or <=5 media items per pass.
- `getSeedMediaCleanup(ex: Executor, datasetId: string): Promise<SeedCleanupStatus>` through uploads service.

- [ ] Inventory real FK and polymorphic references before deleting anything. Add a test that compares actual FK metadata against the reviewed dependency set, so schema changes fail closed. Include JSON/thread subject snapshots and provider-ID sharing, not just FK edges.
- [ ] Add legacy-fixture tests containing a real favorite, message, review, receipt, notification, owner profile reference and shared Cloudinary object. These are directly constructed database fixtures before removal; no public endpoint should permit creating them after Task 5.
- [ ] Capture red tests, then implement removal request: validate confirmation/digest, serialize operation, transactionally hide all 230 owned records and queue removal. A failure rolls back hiding and operation together. A failed partial seed can be removed; an active archive cannot.
- [ ] Under established lock order, aggregate dependency protection through services. Protect the transitive closure: if a real activity references a seeded listing, retain that listing's required owner/media; if a shared object is used by real uploads, retain the object. Do not overwrite protected records to erase their identity.
- [ ] Hide/archive protected records and retain their dependent real activity. Hard-delete only proven safe owned rows, in dependency order. Do not call general account/business deletion or `TRUNCATE`, broad prefix deletes, CASCADE, or `onConflictDoNothing` as ownership proof.
- [ ] Recheck ownership/digests before each deletion. Missing owned rows are idempotently handled; an existing row with mismatched ownership is a failed operation. Retain tombstones and explicit retained reason/counts.
- [ ] Queue only unreferenced owned images into existing host-deletion outbox. Keep operation at remove-media until deletions succeed, or failed with a retryable cleanup code if provider retries are exhausted. Never turn pending external cleanup into a success toast.
- [ ] In a test seeded with a preexisting real favorite, assert the final API state and preserved row directly:

```ts
import { expect } from "bun:test"
import { eq } from "drizzle-orm"
import { seedStatusSchema } from "@sayaratak/shared/schemas/admin-seed"
import { db } from "~/shared/db/client"
import { favorites } from "~/modules/favorites/favorites.tables"
import { call } from "../../../tests/helpers"

const statusResponse = await call(admin, "/admin/seed", { method: "GET" })
const finalStatus = seedStatusSchema.parse(await statusResponse.json())
expect(finalStatus.dataset?.state).toBe("retained")
expect(finalStatus.operation?.state).toBe("completed")
expect(finalStatus.operation?.retainedRecords).toBeGreaterThan(0)
const saved = await db.select().from(favorites).where(eq(favorites.listingId, listingId))
expect(saved.some((row) => row.userId === realUserId)).toBe(true)
```

Place these assertions inside the removal integration test using that test's `admin`, `listingId`, and `realUserId` fixtures. Separately request the captured listing slug anonymously and require HTTP 404. Do not use the admin viewer for public visibility checks.

- [ ] A no-dependency removal reaches removed with 0 seeded public rows; protected removal reaches retained, not ready-to-reseed. Prepared-only datasets can use the same confirmed removal to clear staged assets and archives.
- [ ] Test concurrent remove/start/retry, commit-acknowledgment loss, failed media deletion then retry, missing rows, unrelated real rows and shared objects. Verify site notice becomes false only after no synthetic record is publicly reachable.
- [ ] Run focused removal/FK/deletion-outbox tests and static/OpenAPI gates; update graph/trackers; commit `step 11.6-seed-6: remove only owned seed data`.

## Task 7: Admin workflow, small notice, and public controls

**Files**
- Create `web/src/features/admin-seed/queries.ts`, `progress.ts`, components `seed-settings.tsx`, `seed-assets.tsx`, `seed-operation.tsx`, `seed-confirmation.tsx`.
- Modify site-settings-page, query-keys, siteQuery and public-layout.
- Create `web/src/components/app/seed-notice.tsx`, `web/tests/admin-seed.test.tsx`, `admin-seed-progress.test.ts`, `seed-notice.test.tsx`.
- Modify `contact-actions.tsx`, `mobile-contact-bar.tsx`, listing cards/detail/favorite controls, profile/review/message controls.
- Modify listing detail-loader/JSON-LD and directory loader/head/JSON-LD functions.
- Add keys to both existing locale message files with no hardcoded UI strings.

**Interfaces**
- `seedQueries.status` uses `keys.admin.seed` and validates `SeedStatus`.
- Hooks `usePrepareSeed`, `useUploadSeedArchive`, `useStartSeed`, `useRetrySeed`, `useRemoveSeed`; each invalidates status.
- `stagePercent(input: { completed: number; total: number; complete: boolean }): number | null`.
- `SeedNotice({ active }: { active: boolean })`; passive readable text, no alert role.
- Existing action components receive `interactionMode?: InteractionMode`; absent means live for compatibility. Preview mode renders an accessible reason rather than contact links or enabled handlers.

- [ ] Load applicable shadcn/TanStack/frontend skills at implementation time; inspect installed Base UI progress, file input and dialog APIs before using them. Do not modify UI primitives for styling.
- [ ] Capture failing tests for disabled capability explanation, prompt download, archive validation errors, complete/missing asset counts, seeding progress, failed retry, reload, duplicate clicks, removal confirmation and retained cleanup summary.
- [ ] Implement pure percentage arithmetic and regressions:

```ts
import { expect, test } from "vitest"
import { stagePercent } from "@/features/admin-seed/progress"

test("100 percent requires a committed completed stage", () => {
  expect(stagePercent({ completed: 230, total: 230, complete: false })).toBe(99)
  expect(stagePercent({ completed: 230, total: 230, complete: true })).toBe(100)
  expect(stagePercent({ completed: 0, total: 0, complete: false })).toBeNull()
  expect(stagePercent({ completed: 0, total: 0, complete: true })).toBe(100)
})
```

Return null for invalid/noninteger/negative/out-of-range inputs rather than clamping corrupt status to success. Shared schemas should reject those first.

- [ ] Poll server status every two seconds while an operation is receiving/queued/running; stop on terminal state or auth loss; reconnect/refocus refetch. Distinguish stalled network from job failure. Do not start client timers to fake percentage or treat XHR bytes as accepted images.
- [ ] Upload one archive at a time. After acceptance, show actual accepted/missing assets. For duplicates/mismatched generations explain which files conflict and require explicit replacement confirmation. Keep seed disabled until all assets are accepted; server enforces it again.
- [ ] Download the prompt JSON through the authenticated API; use a real downloadable Blob URL and revoke it after use. Do not navigate to an unprotected archive or copy credentials into a URL.
- [ ] Use ConfirmDialog for Seed and Remove actions; removal uses RemoveButton. Confirmation names 200/30 and current actual owned counts, warns about protected rows, and does not imply full database restore.
- [ ] On operation state/counter change invalidate listing/directory/map/admin status keys and site. On finished removal evict owned listing/business detail query keys and call the installed router's verified invalidation API so matched public loaders reread visibility. Do not clear unrelated user caches or use module-global QueryClient state.
- [ ] Render exactly one `SeedNotice` immediately inside shared public main content, caption size and compact spacing. Suggested EN: "Demo data. Contact and payments are unavailable for these listings." Use readable text contrast and wrap. No background band, icon, border, close button, popup, sticky placement or per-record badge.
- [ ] Notice is active if current site says demoActive OR currently matched page content contains preview interaction metadata. Add an explicit `containsPreview` boolean to listing/detail, directory/detail, home/search/rail and map loader summaries; derive it from actual records/points, not route names. Read safe matched-loader metadata in the public shell, with subscribed currently displayed query data as the fallback for background refetch. No persistent module-global boolean. This prevents stale real-only `/site` responses from hiding the notice on newly seeded content.
- [ ] Set site query staleTime to 0 and refetch on public navigation/focus. Do not suppress site errors into a false demo flag when preview records are present. Keep public HTML/cache behavior no-store where preview content can render; test initial SSR and client navigation.
- [ ] Disable all applicable public actions for preview items on desktop/mobile cards, detail, map popup, profiles and reviews. Do not use the existing banned/unavailable warning as a substitute demo label.
- [ ] Preview detail head adds noindex; preview records never generate Vehicle/Product/Offer/LocalBusiness JSON-LD. Exclude preview entries from collection structured data. Keep real-record SEO behavior unchanged.
- [ ] Run web typecheck/lint/check/i18n and focused Vitest with `--maxWorkers=2`, then affected build/size gates. Record manual walkthrough readiness; commit `step 11.6-seed-7: add admin seeding workflow and compact notice`.

## Task 8: Integrated recovery, browser proof, and operator handoff

**Files**
- Create `web/e2e/admin-seed.spec.ts`, fixtures under `web/e2e/fixtures/admin-seed/`.
- Create `api/src/modules/admin-seed/admin-seed.recovery.test.ts` and full-count integration test.
- Update `api/docs/ADMIN_SEED.md`, `api/RUNBOOK.md`, `web/docs/SWAP_TO_REAL_API.md`, both progress trackers.
- Regenerate `api/openapi.json`; update graph after final code edits.

**Interfaces**
- Existing real-API E2E config and guarded local test DB only. Do not add an unguarded reset endpoint or enable `_test` routes outside NODE_ENV=test and APP_ENV=test.
- Use real database/services, fake external mail/files only. Full-manifest tests execute 230 records/460 real validated image fixtures, not 460 model-generated pictures.

- [ ] Run one complete install with full counts and verify listings/business distribution, media mappings, required search filters, detail pages, inventory and no fake billing/reviews/promotions.
- [ ] Kill a child worker between batches, restart it, and verify committed checkpoints resume. Inject provider acknowledgment loss at the file boundary, duplicate start/retry requests, and removal failure. Do not mock domain services to simulate successful recovery.
- [ ] Test old/no-store site payload plus fresh preview listing SSR/client navigation: one notice must still appear. Test both locales and 390/1280 widths, keyboard progress and accessible confirmations.
- [ ] Verify no phone/WhatsApp links, message/review/favorite side effects, auth mail, promotion checkout, exposed archive/provenance secrets, preview JSON-LD or sitemap entries. Verify normal real-listing interactions still work.
- [ ] Verify valid staged images survive orphan cleanup, expired rejected generations are cleaned safely, scratch files are removed and R2 keys never overlap backups.
- [ ] Measure ZIP worker RSS with maximum allowed input and one decode; require staying within the deployed API memory budget with the normal server running. Do not claim an exact memory/latency bound from source inspection alone.
- [ ] Run required frozen install/audit and shared static checks, API static/OpenAPI/full tests, web static/i18n/full Vitest, build/size, and affected real-API journeys sequentially. Use the AGENTS.md full PG_CLIENT_CMD prefix for backup tests. Start/verify/stop postgres-test as documented, never operate on owner development or remote databases.
- [ ] Run scoped code review, address findings, then `graphify update .` and final whitespace/static checks. No failing gate may be waived silently.
- [ ] Record actual counts/results, all unresolved gates, dependency additions, runtime needs and exact resume point. Commit `step 11.6-seed-8: verify seed lifecycle and recovery`.

### Manual browser walkthrough

1. Open admin settings in English and Arabic. Without capability enabled, verify the explanation is clear and no seed action can run.
2. With approved local test configuration, prepare the dataset and download the prompt pack. Verify exactly 460 unique image prompts and filenames for 230 records.
3. Upload a malformed archive, then a valid small archive, then the remaining batches. Confirm actionable errors, actual missing counts and unavailable Seed button until all images are accepted.
4. Confirm Seed data. Refresh during queued/running states; open a second admin tab. Counts must agree and a duplicate click must not create another run.
5. Interrupt/restart the local worker, reconnect and verify progress resumes, not resets. Trigger one retryable media failure and verify explicit retry.
6. Browse home/search/map and listing/business detail at 390 and 1280 pixels. Check one small readable notice, RTL wrapping and no overflow. Real records must retain normal actions; seeded records must not contact anyone or create activity.
7. Inspect preview page source/SEO and sitemap. Noindex is present and fictional offers/business schema are absent.
8. Confirm Remove seeded data. Refresh during removal, then verify seed content is gone, real account/listing/activity still exists and retained dependencies are explicitly reported.
9. Leave hosted deployment and actual image generation to separate owner-authorized work. Do not upload the generated fixture images to the live marketplace.

## Review checklist and execution boundary

- [x] Every approved spec section maps to a task: catalog/prompts 1; durable auth/admin state 2; archive/decode 3; media/recovery 4; install/restrictions/indexing API and contact compatibility 5; removal 6; admin/public UI/SEO 7; full verification/walkthrough 8.
- [ ] Dependency additions and R2 namespace reuse are explicitly accepted before Task 3. Missing credentials disable hosted use rather than trigger provider setup.
- [x] Verified proposed package versions against registry metadata and archive/image API documentation. Verified installed Bun 1.4.2 CRC-32 behavior. Installation, decoder/native runtime compatibility, and provider behavior remain implementation gates.
- [x] No production code has been implemented by writing this plan.
- [ ] Owner selects inline execution or subagent-driven execution. Run tasks in order, with a recorded review/gate boundary after each.
- [ ] No push, deployment, provider configuration, live archive upload, or live seeding without separate approval.
