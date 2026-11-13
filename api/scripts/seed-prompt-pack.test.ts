import { expect, test } from "bun:test"
import { mkdtemp, rm, rmdir } from "node:fs/promises"
import { join } from "node:path"

import { buildSeedManifest } from "~/modules/admin-seed/admin-seed.catalog.service"

import { exportSeedPromptPack } from "./seed-prompt-pack"

test("export writes all prompts and refuses to overwrite an existing file", async () => {
  const directory = await mkdtemp("/tmp/opencode/seed-export-")
  const path = join(directory, "prompts.json")
  try {
    await exportSeedPromptPack(path)
    const original = await Bun.file(path).text()
    expect(JSON.parse(original)).toMatchObject(buildSeedManifest())
    expect(JSON.parse(original).assets).toHaveLength(460)
    await expect(exportSeedPromptPack(path)).rejects.toMatchObject({
      code: "EEXIST",
    })
    expect(await Bun.file(path).text()).toBe(original)
  } finally {
    await rm(path, { force: true })
    await rmdir(directory)
  }
})

test("CLI runs without database, provider or authentication environment", async () => {
  const directory = await mkdtemp("/tmp/opencode/seed-cli-")
  const path = join(directory, "prompts.json")
  try {
    const process = Bun.spawn(
      [
        Bun.which("bun") ?? "bun",
        "--no-env-file",
        "scripts/seed-prompt-pack.ts",
        path,
      ],
      {
        cwd: join(import.meta.dir, ".."),
        env: { PATH: Bun.env.PATH },
        stdout: "pipe",
        stderr: "pipe",
      }
    )
    const errors = await new Response(process.stderr).text()
    expect(errors).toBe("")
    expect(await process.exited).toBe(0)
    expect(JSON.parse(await Bun.file(path).text()).assets).toHaveLength(460)
  } finally {
    await rm(path, { force: true })
    await rmdir(directory)
  }
})
