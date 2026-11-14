# Admin-managed dataset

The approved dataset contains 200 listings, 30 businesses and 460 images. It is separate from the development/test database seed. No generated content is installed by exporting prompts.

## Export the image prompts

From the repository root:

```bash
bun run --cwd api seed:prompts /tmp/opencode/sayaratak-image-prompts.json
```

The output path must not exist. Export reads no database, runtime secrets or credentials and works with `bun --no-env-file scripts/seed-prompt-pack.ts <new-path>` from `api/`.

The JSON contains all records, one complete prompt per image, exact accepted filenames and pairing instructions. Generate the first image of each record before the second. Supply the first image to your model as a reference when generating the second.

## Image checklist

- Each pair must depict the same vehicle, component or fictional business. Check model generation, body proportions, color, doors, wheels, lighting and setting.
- Images are fictional. Do not copy a real person's identity, existing business, contact details, registration plates or endorsement.
- Recommended output: 1600×1200, landscape 4:3. Accepted sizes range from 1200×900 to 4096×3072.
- Use JPEG, PNG or WebP, at most 2 MiB per image. Use exactly one listed filename per logical image.
- Return flat ZIPs containing only the requested images. No nested directories or extra files.
- Each ZIP is at most 25 MiB compressed, 100 MiB expanded and 50 images. The dataset requires at least ten batches; split further to meet the byte limits.
- Review every generated image manually. Prompt wording cannot guarantee an accurate or consistent output.

## Availability

Tasks 1 and 2 provide the catalog/export and admin preparation/status boundary. Image intake, storage, installation, removal and browser controls are later tasks; they must not be simulated by successful stub endpoints.

The final public experience requires one small readable bilingual inline notice, disabled synthetic interactions, noindex for seeded detail pages and provenance-based removal preserving real data. No production seed execution or deployment is authorized by this document.

## Preparation API

All three endpoints require the existing admin cookie session after its email-code step. Bearer tokens cannot operate admin routes. Responses are not cacheable.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/admin/seed` | Reports capability names, the catalog digest, persisted preparation, real operation progress and missing-image counts. No credentials or synthetic owner descriptors are returned. |
| `POST /api/v1/admin/seed/prepare` | Accepts exactly `{}`. Creates one immutable catalog snapshot, 460 expected image rows and one audit event transactionally. Does not create users, businesses, listings or images. Repeated/concurrent calls return the same preparation. |
| `GET /api/v1/admin/seed/manifest` | Downloads the persisted prompt pack, validating its stored digest first. Requires preparation. |

`ADMIN_SEED_ENABLED` defaults to false. Status remains readable to authorized admins when disabled; preparation/download return 403. Outside isolated test mode, Cloudinary and all four R2 settings must also be configured. Missing names are reported in capability status, never secret values. No provider configuration or fake-disk fallback is performed automatically.

The additive migration must be applied before running code that reads the new columns. Only `postgres-test` has been migrated as part of Task 2 verification. Do not deploy the new code against an unmigrated development or hosted database. Apply migrations to another target only after target verification and explicit authorization.

## Task 2 acceptance walkthrough

Use an isolated local/test database with the migration applied, not the live marketplace:

1. Finish admin sign-in and its email-code step. Request status and confirm disabled capability is explained when the flag is off.
2. With explicitly enabled isolated test configuration, request preparation with an empty object. Confirm state is `preparing`, operation is null and all 460 images are missing.
3. Repeat preparation from a second request. Confirm the dataset ID/digest and image count do not change.
4. Download the manifest and verify 230 records, 460 individual prompts and reference-image filenames.
5. Verify ordinary users, challenge-only sessions and admin bearer requests cannot access this feature.
6. Confirm public record/account counts remain unchanged. No seed button or new public notice should appear yet; those belong to Task 7.

The CLI prompt exporter remains usable without enabling this API or configuring providers.
