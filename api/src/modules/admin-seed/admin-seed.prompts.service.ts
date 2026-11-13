import type {
  SeedAsset,
  SeedManifest,
  SeedRecord,
} from "@sayaratak/shared/schemas/seed-manifest"

const WIDTH = 1600
const HEIGHT = 1200
const STYLE =
  "Create a photorealistic fictional marketplace photograph, landscape 4:3, 1600 by 1200 pixels. Natural Sudanese daylight, believable materials, accurate geometry, restrained colors, clear subject, no dramatic effects. No readable contact details, watermarks, added text, usable registration plates, endorsements or recognizable real people. This is a synthetic scene, not evidence of a real offer."

/** Creates two individually specified prompts for every catalog record. */
export function buildSeedAssets(records: SeedRecord[]): SeedAsset[] {
  return records.flatMap((record) => [asset(record, 0), asset(record, 1)])
}

/** Exports one portable JSON pack, without runtime configuration or credentials. */
export function renderSeedPromptPack(manifest: SeedManifest) {
  return `${JSON.stringify(
    {
      ...manifest,
      instructions: [
        "Generate the first image before the second; supply it as the reference image.",
        "Export JPEG with the exact filename, or its listed PNG/WebP alternative.",
        "Check identity, configuration, body proportions, color and consistent components in both views.",
        "Inspect generated output manually; text prompts cannot guarantee visual accuracy.",
        "Upload flat ZIP batches: at most 50 images, 25 MiB compressed, 100 MiB expanded.",
        "Each image must be at most 2 MiB; split into at least ten archives and more if needed.",
        "No extra files or nested folders. Keep the 4:3 ratio, minimum 1200x900, maximum 4096x3072.",
      ],
    },
    null,
    2
  )}\n`
}

function asset(record: SeedRecord, position: number): SeedAsset {
  const stem = `${record.id}-${position + 1}`
  const referenceFilename = position === 0 ? null : `${record.id}-1.jpg`
  const reference = referenceFilename
    ? `Use ${referenceFilename} as the reference image. Preserve the exact same subject identity, configuration, color, wear and setting; do not substitute a different subject.`
    : "Establish a coherent subject identity for the matching reference image."
  return {
    id: stem,
    recordId: record.id,
    position,
    filename: `${stem}.jpg`,
    allowedFilenames: [`${stem}.jpg`, `${stem}.png`, `${stem}.webp`],
    referenceFilename,
    width: WIDTH,
    height: HEIGHT,
    prompt: `${STYLE} Subject: ${record.name.en}. ${subject(record)} ${view(record, position)} ${reference}`,
  }
}

function subject(record: SeedRecord) {
  if (record.kind === "vehicle")
    return `Exact configuration: ${record.year}, ${record.vehicleType}, ${record.color.en} body, ${record.fuel}, ${record.transmission} transmission. Match the production generation and body proportions.`
  if (record.kind === "part")
    return `Item geometry: ${record.visualDescription}. Show only the unbranded component, not packaging or claims of compatibility.`
  if (record.kind === "mechanic")
    return "A fictional adult Sudanese technician in clean workwear and a practical, safely arranged automotive workspace. Do not copy a real person's face or business."
  return "A fictional Sudanese automotive business, practical concrete construction, tidy functional premises, no identifiable existing storefront or invented brand signage."
}

function view(record: SeedRecord, position: number) {
  if (record.kind === "vehicle")
    return position === 0
      ? "Front three-quarter view of the complete vehicle, all wheels visible, on a level dusty forecourt, eye-level 50mm lens."
      : "Rear three-quarter view from the opposite side, complete vehicle in frame, consistent lighting and forecourt."
  if (record.kind === "part")
    return position === 0
      ? "Complete item centered on a clean grey workbench, realistic scale, soft directional daylight."
      : "Closer opposite-side detail showing mounting points, edges and material texture on the same workbench."
  if (record.kind === "mechanic")
    return position === 0
      ? "Natural waist-up environmental portrait, relaxed pose, clean workwear and softly visible workbench."
      : "Wide workplace view of the same technician using a diagnostic tool beside a safely parked vehicle; no unsafe lifting."
  return position === 0
    ? "Wide exterior three-quarter view with a clear entrance and functional forecourt, no readable signs."
    : "Interior wide view of the same premises, neatly arranged vehicles or service bays, realistic tools and circulation space."
}
