# Admin-managed dataset

The approved dataset contains 200 listings, 30 businesses (dealerships, workshops, mechanics) and 460 images. It is separate from the development/test database seed and operates through a versioned, durable, and recoverable administrative lifecycle.

## 1. Export the image prompts

From the repository root or via the authenticated Admin UI:

```bash
bun run --cwd api seed:prompts /tmp/opencode/sayaratak-image-prompts.json
```

Or download directly from `GET /api/v1/admin/seed/manifest` after preparation.

The prompt pack contains 230 records, one complete prompt per image, exact accepted filenames and pairing instructions. Supply the first image to your model as a reference when generating the second.

## 2. Image generation checklist

- Each pair must depict the same vehicle, component or fictional business. Check body proportions, color, doors, wheels, lighting and setting.
- Images are fictional. Do not copy a real person's identity, existing business, contact details, registration plates or endorsement.
- Output requirements: 1600×1200 recommended landscape 4:3. Accepted dimensions: 1200×900 to 4096×3072.
- Formats: JPEG, PNG or WebP, at most 2 MiB per image. Use exactly one listed filename per logical image.
- Packaging: Flat ZIPs containing only requested images. No nested directories or extra files.
- Byte limits: At most 25 MiB compressed, 100 MiB expanded, and at most 50 images per ZIP archive.

## 3. Administrative lifecycle API

All endpoints require the authenticated admin cookie session with verified two-factor email OTP. Bearer tokens and unverified sessions are rejected with 401/403.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/v1/admin/seed` | GET | Reports capability status, manifest digest, asset counts (accepted, rejected, missing), and active operation. |
| `/api/v1/admin/seed/prepare` | POST | Prepares the immutable dataset manifest, 460 expected asset records, and system audit event. Idempotent. |
| `/api/v1/admin/seed/manifest` | GET | Downloads the authenticated prompt JSON pack matching the prepared manifest digest. |
| `/api/v1/admin/seed/archives` | POST | Streams and validates a flat ZIP archive, decodes images with Sharp, stores provider intents, and checks progress. |
| `/api/v1/admin/seed/start` | POST | Starts the seed execution, committing in batches of at most 25 records. Returns 202 with `SeedOperation`. |
| `/api/v1/admin/seed/retry` | POST | Retries an interrupted or failed install operation from its last committed checkpoint without resetting counters. |
| `/api/v1/admin/seed/remove` | POST | Initiates transactional removal of owned seed records and media while preserving any item touched by real user activity. |

## 4. Public contract & preview isolation

- Seeded listings and businesses are tagged with `seedDatasetId` and expose `interactionMode: "preview"`.
- Phone and WhatsApp contact actions are withheld: public responses never return phone numbers or links for preview items.
- Favorites, reviews, inquiries, reports, and paid promotion checkout are disabled for preview targets.
- Search and listings detail pages render exactly one compact, passive `<SeedNotice />` ("Demo data. Contact and payments are unavailable for these listings.").
- Preview detail pages include `<meta name="robots" content="noindex" />` and omit all Schema.org structured data (Product, Vehicle, LocalBusiness).

## 5. Failure recovery & safe removal

- **Worker interruption**: If an install worker terminates mid-run, `POST /admin/seed/retry` resumes from the last committed pass (`operation.completed`) rather than resetting or duplicating records.
- **Idempotency**: Repeated `start`, `retry`, or `remove` calls lock the dataset row and return the existing active operation without spawning duplicates.
- **Dependency protection**: When `POST /admin/seed/remove` is called, 13 dependency-owning domains are inspected. Any seed record linked to real user favorites, reviews, messages, or payments is retained in the database to prevent foreign key corruption. Unreferenced seed records and media are safely removed.
- **Orphan media cleanup**: Unaccepted or superseded image uploads are queued for deletion via the background outbox (`retryHostDeletes`).
