import { open } from "node:fs/promises"

import { buildSeedManifest } from "~/modules/admin-seed/admin-seed.catalog.service"
import { renderSeedPromptPack } from "~/modules/admin-seed/admin-seed.prompts.service"

/** Writes a new prompt pack exclusively; an existing file is never overwritten. */
export async function exportSeedPromptPack(path: string) {
  const contents = renderSeedPromptPack(buildSeedManifest())
  const file = await open(path, "wx", 0o600)
  try {
    await file.writeFile(contents)
  } finally {
    await file.close()
  }
}

if (import.meta.main) {
  const [path, ...extra] = Bun.argv.slice(2)
  if (!path || extra.length > 0) {
    process.stderr.write("Usage: bun run seed:prompts <new-output.json>\n")
    process.exitCode = 1
  } else {
    await exportSeedPromptPack(path)
  }
}
