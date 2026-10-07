// Fetches the sitemap, robots.txt and a dozen sample pages from a running server and asserts the head tags (A6, step 6.9).
// Usage: bun run seo:check [origin]   (default SEO_ORIGIN, then APP_ORIGIN, then http://localhost:3000)
import process from "node:process"

const base = (
  process.argv[2] ??
  process.env.SEO_ORIGIN ??
  process.env.APP_ORIGIN ??
  "http://localhost:3000"
).replace(/\/$/, "")

let failed = 0
const check = (ok: boolean, what: string) => {
  if (!ok) {
    failed++
    console.log(`FAIL ${what}`)
  }
}
const get = (path: string) => fetch(base + path)
const unescape = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")

// robots.txt and sitemap
const robots = await (await get("/robots.txt")).text()
for (const rule of [
  "Disallow: /api/",
  ...["ar", "en"].flatMap((l) =>
    [
      "account",
      "dealer",
      "workshop",
      "mechanic",
      "admin",
      "auth",
      "onboarding",
      "post",
    ].map((s) => `Disallow: /${l}/${s}`)
  ),
])
  check(robots.includes(rule + "\n"), `robots.txt lacks "${rule}"`)
check(
  /^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m.test(robots),
  "robots.txt Sitemap line"
)

const sitemap = await (await get("/sitemap.xml")).text()
const urls = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)]
const locs = urls.map((m) => decodeURI(unescape(m[1]!)))
const under = (dir: string, locale = "ar") =>
  locs.filter((u) => u.includes(`/${locale}${dir}`)).length
check(locs.length > 0, "sitemap has no urls")
for (const [i, m] of urls.entries()) {
  const alt = [...m[2]!.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
    (a) => a[1]
  )
  check(
    alt.join() === "ar,en,x-default",
    `sitemap alternates of ${locs[i]}: ${alt.join()}`
  )
}
for (const dir of [
  "/listing/",
  "/vehicles/",
  "/dealerships/",
  "/workshops/",
  "/mechanics/",
])
  check(
    under(dir) > 0 && under(dir) === under(dir, "en"),
    `sitemap ${dir} counts ar/en`
  )
for (const bad of ["/search", "/map", "/account", "/admin", "/post", "/auth"])
  check(!locs.some((u) => u.includes(bad)), `sitemap lists ${bad}`)
// Profile counts must match the public directories (active rows only).
for (const [dir, api] of [
  ["/dealerships/", "dealerships"],
  ["/workshops/", "workshops"],
  ["/mechanics/", "mechanics"],
] as const) {
  const { total } = (await (await get(`/api/${api}?pageSize=1`)).json()) as {
    total: number
  }
  check(
    under(dir) === total,
    `sitemap ${dir}: ${under(dir)} urls, API ${total}`
  )
}
console.log(
  `sitemap ${locs.length} urls: listings ${under("/listing/")}, landings ${under("/vehicles/")}, profiles ${under("/dealerships/") + under("/workshops/") + under("/mechanics/")} (per language)`
)

// Sample pages: [path, JSON-LD types that must appear, whether the page is indexable].
const first = (dir: string, locale = "ar") =>
  locs.find((u) => u.includes(`/${locale}${dir}`))!.slice(base.length)
const samples: [string, string[]][] = [
  ["/ar", []],
  ["/en", []],
  [first("/vehicles/", "ar"), []],
  [
    locs
      .find((u) => /\/en\/vehicles\/[^/]+\/[^/]+\/[^/]+$/.test(u))!
      .slice(base.length),
    [],
  ],
  [first("/listing/", "ar"), ["BreadcrumbList"]],
  [first("/listing/", "en"), ["BreadcrumbList", "Offer"]],
  [first("/dealerships/", "ar"), ["AutoDealer", "BreadcrumbList"]],
  [first("/workshops/", "en"), ["AutoRepair", "BreadcrumbList"]],
  [first("/mechanics/", "ar"), ["Person", "BreadcrumbList"]],
  ["/en/about", []],
  ["/ar/dealerships", []],
  ["/en/parts", []],
]

const pathOf = (href?: string) =>
  decodeURI(href ?? "").replace(/^https?:\/\/[^/]+/, "")
type Tag = Record<string, string>
const tagsOf = (html: string) =>
  [...html.matchAll(/<(meta|link)\b([^>]*)>/g)].map((m) => {
    const tag: Tag = { tag: m[1]! }
    for (const a of m[2]!.matchAll(/([\w:-]+)="([^"]*)"/g))
      tag[a[1]!.toLowerCase()] = unescape(a[2]!)
    return tag
  })

for (const [path, types] of samples) {
  const res = await get(path)
  const html = await res.text()
  const tags = tagsOf(html)
  const meta = (key: string) =>
    tags.find((t) => t.name === key || t.property === key)?.content
  const where = path
  check(res.status === 200, `${where} status ${res.status}`)
  check(/<title>[^<]+ \| Sayaratak<\/title>/.test(html), `${where} title`)
  check(!!meta("description"), `${where} description`)
  const canonical = tags.find((t) => t.rel === "canonical")?.href
  check(
    pathOf(canonical) === decodeURI(path),
    `${where} canonical ${canonical}`
  )
  const lang = (l: string) =>
    tags.find((t) => t.rel === "alternate" && t.hreflang === l)?.href
  const rest = path.replace(/^\/(?:ar|en)/, "")
  for (const [l, locale] of [
    ["ar", "ar"],
    ["en", "en"],
    ["x-default", "ar"],
  ] as const)
    check(
      pathOf(lang(l)) === decodeURI(`/${locale}${rest}`),
      `${where} hreflang ${l}: ${lang(l)}`
    )
  for (const key of [
    "og:title",
    "og:description",
    "og:url",
    "og:type",
    "og:locale",
    "twitter:card",
  ])
    check(!!meta(key), `${where} ${key}`)
  if (path.includes("/listing/")) check(!!meta("og:image"), `${where} og:image`)
  check(
    meta("robots") === undefined,
    `${where} is noindex but listed in the sitemap`
  )
  const blocks = [
    ...html.matchAll(
      /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs
    ),
  ].map((m) => m[1]!)
  let found = ""
  for (const b of blocks) {
    try {
      JSON.parse(b)
      found += b
    } catch {
      check(false, `${where} JSON-LD does not parse`)
    }
  }
  for (const t of types)
    check(found.includes(`"@type":"${t}"`), `${where} JSON-LD ${t}`)
}

// Filtered and map pages must stay out of the index.
for (const path of ["/ar/search?q=test", "/en/map", "/ar/dealerships?q=a"]) {
  const tags = tagsOf(await (await get(path)).text())
  check(
    tags.some((t) => t.name === "robots" && t.content === "noindex, follow"),
    `${path} lacks noindex, follow`
  )
}

console.log(
  failed
    ? `seo:check: ${failed} failed`
    : `seo:check: ${samples.length} pages ok`
)
if (failed) process.exit(1)
