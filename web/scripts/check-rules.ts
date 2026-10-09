// Fails on physical-direction classes (outside components/ui), on a native <select>, on TODO, FIXME, console.log in src/**, and on a Remove button that does not go through RemoveButton (every Remove asks first).
import { readFileSync, readdirSync } from "node:fs"
import process from "node:process"

const physical = /(?<!\w)-?(?:ml|mr|pl|pr|left|right)-\S|text-(?:left|right)\b/
const banned = /\b(?:TODO|FIXME)\b|console\.log|<select[\s>]/
const skip = ["src/components/ui/", "src/routeTree.gen.ts"]

let failed = 0
for (const file of readdirSync("src", { recursive: true, encoding: "utf8" })) {
  const path = `src/${file}`
  if (!/\.(?:tsx?|css)$/.test(path) || skip.some((s) => path.startsWith(s)))
    continue
  const text = readFileSync(path, "utf8")
  if (/["']common\.remove["']/.test(text) && !text.includes("RemoveButton")) {
    console.error(`${path}: Remove must use RemoveButton, which asks first`)
    failed++
  }
  text.split("\n").forEach((line, i) => {
    if (physical.test(line) || banned.test(line)) {
      console.error(`${path}:${i + 1}: ${line.trim()}`)
      failed++
    }
  })
}
if (failed) process.exit(1)
