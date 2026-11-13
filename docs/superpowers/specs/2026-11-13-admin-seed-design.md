# Admin-managed public demo dataset

## Approval and scope

Owner approved the architectural proposal on 2026-11-13, then reduced the dataset to 200 listings and 30 businesses and requested a very small public notice. This document records that revised design for review before implementation planning.

This is a production-capable, explicitly enabled public demo dataset, not permission to run the existing development seed in production. Existing development/test seed behavior and its production refusal remain unchanged.

No deployment, live data writes, image generation API integration, or full-database restore is included in this implementation authorization.

## Dataset

| Record | Count |
| --- | ---: |
| Cars for sale | 100 |
| Trucks for sale | 20 |
| Motorcycles for sale | 20 |
| Tuk-tuks for sale | 10 |
| Spare parts | 25 |
| Rentals | 25 |
| **Listings total** | **200** |
| Dealerships | 10 |
| Workshops | 10 |
| Mechanics | 10 |
| **Businesses total** | **30** |

Every listing and business receives two images: 460 images in total. Image generation is performed by the owner's model outside the application. The application does not generate images or spend model credits.

Content is deterministic and versioned, with Arabic/English descriptions and names where supported by the existing schemas. Titles and field shapes follow the actual public contracts rather than introducing incompatible translations. Prices are whole SDG pounds. Specifications, make/model/year combinations, locations, and associated image prompts must agree.

Use the existing supported taxonomy without modifying real reference records. Do not invent unsupported makes/models just to fill a quota. Public prices are fictional examples, not claims about current market value.

No fabricated reviews, ratings, views, leads, messages, payments, subscriptions, verification badges, or paid-promotion claims. Supporting synthetic owners have no usable login credentials, no real email or telephone recipients, no admin privileges, and cannot receive auth mail. Authentication paths must prevent synthetic-account access rather than relying only on missing passwords.

Existing real accounts, listings, taxonomy, settings, plans, legal pages, and content must not be overwritten.

## Prompt pack and image handoff

The admin can download a versioned prompt pack before seeding. It contains:

- A machine-readable manifest with stable dataset, record, and asset identifiers.
- One complete prompt per image, its exact required filename, target dimensions, and associated record.
- Instructions for returning images in multiple ZIP archives.
- Record specifications and pairing instructions so the second image depicts the same vehicle, part, or fictional business rather than a different subject.

Prompts use fictional businesses, no real personal identities, no readable contact details, and no usable number plates. They describe the exact vehicle configuration or service setting. Images must not imply that an actual vehicle, business, or endorsement exists.

The recommended output is 1600 by 1200 pixels, landscape 4:3. Accepted files are decoded JPEG, PNG, or WebP images with the declared aspect ratio and dimensions between 1200 by 900 and 4096 by 3072. File extensions and MIME headers alone are insufficient validation.

Proposed upload limits are 25 MiB compressed, 100 MiB expanded, 50 images per archive, and 2 MiB per image. Reject encrypted archives, nested archives, symlinks, absolute/traversal paths, unexpected files, duplicate asset names, unsupported formats, malformed images, excessive dimensions, and expansion beyond the limits. Enforce resource limits during processing, not after reading the expanded archive into memory. A rejected archive must not partially replace previously accepted assets.

The admin sees accepted/missing/rejected assets with actionable reasons. Retrying the same valid asset is idempotent; mismatched content under an accepted filename requires an explicit replacement before seeding. Once a seed operation begins, its dataset and image manifest are immutable.

Store accepted images through the existing media service with ownership/provenance sufficient for safe cleanup. Do not store archives or image bytes in PostgreSQL or depend on local service disk for durable state. Interrupted uploads may be retried; incomplete operations must not make assets appear ready.

All 460 required assets must pass validation before Seed data is enabled. Start-time validation must enforce the same rule server-side.

## Admin experience

Place the feature in admin settings as a separate dataset-management section. English/LTR, Arabic/RTL, mobile, keyboard, and screen-reader use are required.

The flow is Prepare images, Upload, Validate, Ready, Seed data, Complete. Each asynchronous operation displays its current stage and completed/total units. The primary seeding operation has queued, running, failed, and completed states. Failed operations offer Retry. Removal has its own queued, running, failed, and completed states.

Show percentages derived from committed work with a fixed denominator for each stage. Display image validation/upload and record insertion separately so network retries do not fake database progress. Round down while incomplete and display 100% only when that stage's required work is committed. Show records as 0–230, listings as 0–200, businesses as 0–30, and images as 0–460 where relevant; supporting internal rows are not additional public records.

Do not show invented time estimates or advance progress on a timer. Refreshing or returning from another device reads the same operation. Lost polling connections must show stale/reconnecting state rather than reporting completion.

Seed start requires a confirmation with counts and the public-demo behavior. Repeated clicks or requests must return the existing operation rather than enqueue duplicates. Do not offer a second active dataset while one is installed, partially installed, or being removed.

Label the reverse operation Remove seeded data, not Restore. Its confirmation shows the exact owned public-record counts and warns that protected records may be retained. Use the repository's existing confirmation/removal controls.

## Public notice and demo restrictions

Use one small inline sentence in the shared public layout, not a prominent banner, modal, popup, sticky layer, or individual-listing badge. Suggested text: "Demo listings are shown. Contact and payments are unavailable for them." Supply a natural Arabic equivalent.

Use the existing caption typography, normal readable contrast, and compact spacing. It must wrap on mobile without horizontal overflow. Do not make it dismissible or hide it from assistive technology. It remains present whenever seeded content can be publicly reached, including partially completed or failed seeding/removal.

Seed provenance is internal metadata, not a visible individual-listing label. Public contracts expose only the minimal action-availability metadata needed by the UI.

For synthetic listings and businesses, disable phone/WhatsApp contact, messaging, reviews, payment/purchase, and promotion actions. Prevent new favorites or other user-created attachments to these records to reduce removal conflicts. Explain unavailable actions through localized accessible text, not empty handlers or links. Enforce applicable mutation restrictions in the API, including direct requests and attempts to manipulate synthetic owners.

Do not emit synthetic contact details through public responses, structured data, or links. Generated detail pages use noindex and are absent from sitemaps. Search-result pages containing synthetic records must not expose them through indexable structured data. Real records retain their normal capabilities and indexing policy.

The notice state is derived from durable visible/retained dataset state, not an independently editable switch. Public cache invalidation must prevent seeded content from being served without its notice.

## Backend architecture and recovery

Use a dedicated feature module following the existing route/service/query/table boundaries. Shared request/response schemas and OpenAPI entries follow repository conventions. Cross-domain writes occur through domain services, not a new module directly accessing other modules' tables.

Persist dataset version, manifest digest, actor, timestamps, operation type/state, progress, checkpoints, and structured failure details in PostgreSQL. Persist exact ownership of every inserted public record and supporting asset. An identifier prefix alone is not proof of ownership.

Use the existing scheduler/job-lock infrastructure to execute bounded passes. Persist queued work before returning an accepted response. Do not perform the entire seed in a request or rely on an untracked in-memory promise.

Enforce one active seed/removal operation across API instances with database constraints and transactional locking. Each batch writes records, provenance, and checkpoint atomically. Stable identifiers and uniqueness constraints make retries safe; collisions with real records are conflicts, never successful skips or overwrites. A restart processes the last durable checkpoint, including a commit whose acknowledgment was lost.

Bounded passes keep memory and transaction duration limited. Database work scales linearly with dataset size; memory use is bounded by the configured batch size rather than the total archive/dataset. Media operations are separately checkpointed because Cloudinary and PostgreSQL cannot share an atomic transaction. Recover interrupted external operations without double-counting progress or deleting unowned assets.

Authorization is server-side admin access with the existing admin step-up policy, rate limits, and audit events. Record starts, failures, retries, completion, and removal without logging secrets or raw archives. Public users cannot query manifests, operations, or internal synthetic-owner metadata.

## Safe removal

First mark the dataset as removing and hide its public records. Guard concurrent mutations at the database/service boundary so removal cannot race with new dependencies.

Remove only provenance-owned records and media in dependency order. Do not cascade into real accounts or real activity. Detect real dependencies under locks before physical deletion. Keep affected records archived and nonpublic, preserve dependent real activity, and report retained counts/reasons to the admin.

Missing already-removed owned records count as idempotently handled; ownership inconsistencies are errors. Retry continues from removal checkpoints. Keep durable tombstones/audit history needed to explain completed or partially retained cleanup.

Remove a Cloudinary asset only when it belongs to this dataset and has no surviving references. Failed media deletion remains pending cleanup and is visible to admins; it must not cause real media deletion or pretend that cleanup fully succeeded.

The public notice may disappear once no synthetic content remains publicly reachable, even if protected archived records or media-cleanup work remain. Completion explicitly distinguishes fully removed from completed with protected records retained.

## Verification and release

Tests must cover:

- Deterministic counts, taxonomy-valid specifications, bilingual content, image/record agreement, and absence of credentials or fabricated activity.
- Archive traversal, symlinks, expansion limits, malformed images, duplicates, rejected-batch atomicity, missing files, and interrupted uploads.
- Anonymous/nonadmin access, admin step-up, rate limits, direct demo-action attempts, auth isolation, and public response leakage.
- Concurrent starts, retries after committed-but-unacknowledged batches, process interruption, duplicate prevention, conflicts with real rows, and correct durable progress.
- Removal with real dependencies, concurrent mutations, unrelated records/media, missing owned rows, failed external cleanup, and retry.
- Small public notice, RTL/mobile layout, noindex/sitemaps, disabled interactions, progress reconnects, and confirmations.

Run applicable shared/API/web static, format, i18n, contract, unit/integration, build/size, and affected browser gates sequentially. Update the knowledge graph after code changes. Do not claim gates passed before execution.

Manual browser walkthrough: sign in as an admin; download prompts; upload valid and invalid ZIP batches; verify missing counts and errors; seed and refresh mid-run; verify actual progress and duplicate-click behavior; browse English/Arabic public listings on mobile/desktop; confirm the small notice and unavailable synthetic interactions; confirm real records still work; remove seeded data with confirmation; verify real data remains and protected dependencies are reported.

Deployment and hosted seeding require separate explicit approval after local verification. Implementation must not silently enable public demo data on an existing live deployment.
