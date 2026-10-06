// Fails on physical-direction classes (outside components/ui), on a native <select>, and on TODO, FIXME, console.log in src/**.
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
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (physical.test(line) || banned.test(line)) {
        console.error(`${path}:${i + 1}: ${line.trim()}`)
        failed++
      }
    })
}
if (failed) process.exit(1)
