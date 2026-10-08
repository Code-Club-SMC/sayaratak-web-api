import { Suspense } from "react"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AnalyticsPage } from "@/features/analytics/components/analytics-page"
import { analyticsSearchSchema } from "@/features/analytics/schemas"
import { WorkshopProfilePage } from "@/features/directory/components/workshop-profile-page"
import { workshopProfileSearchSchema } from "@/features/directory/workshop-schemas"
import { NowProvider } from "@/lib/now"
import { db, resetDb } from "@/mocks/db"
import { dayKey } from "@/mocks/lib"
import { pick } from "./pick"
import { renderShell } from "./shell-render"

Element.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

beforeEach(() => {
  resetDb()
  sessionStorage.clear()
  document.cookie = "mock_fail=; Path=/; Max-Age=0"
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

const day = (back: number) => dayKey(Date.now() - back * 86_400_000)
const counts = (c: Partial<Record<string, number>>) => ({
  view: 0,
  phone_click: 0,
  whatsapp_click: 0,
  share: 0,
  banner_click: 0,
  banner_view: 0,
  ...c,
})
// Replaces the events of some targets with the given rows: `[target, days back, counts]`.
const setEvents = (
  ids: string[],
  rows: [string, number, Partial<Record<string, number>>][]
) => {
  db.events = db.events.filter((e) => !ids.includes(e.targetId))
  for (const [targetId, back, c] of rows)
    db.events.push({
      id: `ev-${targetId}-${day(back)}`,
      day: day(back),
      targetId,
      counts: counts(c),
    })
}
const dealer = () =>
  db.users.find((u) => u.role === "dealership" && u.onboardingDone)!
const dealerListings = () =>
  db.listings.filter((l) => l.ownerUserId === dealer().id)
const dealerBiz = () => db.dealerships.find((d) => d.ownerId === dealer().id)!
const card = async (name: string) =>
  (await screen.findByText(name)).parentElement!

describe("search params", () => {
  it("an unknown or missing period falls back to 30 days", () => {
    expect(analyticsSearchSchema.parse({})).toEqual({ range: "30d" })
    expect(analyticsSearchSchema.parse({ range: "1y" })).toEqual({
      range: "30d",
    })
    expect(analyticsSearchSchema.parse({ range: "7d" })).toEqual({
      range: "7d",
    })
  })
})

describe("dealership analytics", () => {
  const open = (search = "") => {
    const [a, b] = dealerListings()
    setEvents(
      [dealerBiz().id, ...dealerListings().map((l) => l.id)],
      [
        [a!.id, 0, { view: 20, phone_click: 3, whatsapp_click: 2 }],
        [b!.id, 1, { view: 10 }],
        [a!.id, 20, { view: 5 }],
      ]
    )
    return renderShell(<AnalyticsPage role="dealership" />, {
      role: "dealership",
      path: `/en/dealer/analytics${search}`,
    })
  }

  it("shows the five dealership cards with numbers from today's events", async () => {
    await open()
    expect(
      screen.getByRole("heading", { level: 1, name: "Analytics" })
    ).toBeTruthy()
    // 20 + 10 + 5 views in 30 days; today counts.
    await waitFor(async () =>
      expect((await card("Listing views")).textContent).toContain("35")
    )
    expect((await card("Calls")).textContent).toContain("3")
    expect((await card("WhatsApp clicks")).textContent).toContain("2")
    for (const name of ["Messages", "Favorites"])
      expect(screen.getByText(name)).toBeTruthy()
    expect(screen.queryByText("New reviews")).toBeNull()
    expect(screen.queryByText("Profile views")).toBeNull()
  })

  it("a shorter period leaves out older events, and the change reads against the period before", async () => {
    await open("?range=7d")
    // The 20-day-old row falls outside 7 days and outside the 7 before them.
    await waitFor(async () =>
      expect((await card("Listing views")).textContent).toContain("30")
    )
    expect((await card("Listing views")).textContent).not.toContain("%")
  })

  it("changing the period writes it to the address and reloads the numbers", async () => {
    const { router } = await open()
    await waitFor(async () =>
      expect((await card("Listing views")).textContent).toContain("35")
    )
    await pick(screen.getByRole("combobox", { name: "Period" }), "Last 7 days")
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ range: "7d" })
    )
    await waitFor(async () =>
      expect((await card("Listing views")).textContent).toContain("30")
    )
  })

  it("lists the top listings by views with their conversion", async () => {
    await open()
    const table = await screen.findByRole("table")
    const rows = within(table).getAllByRole("row").slice(1)
    expect(rows.length).toBeLessThanOrEqual(10)
    const [a, b] = dealerListings()
    const first = within(rows[0]!)
    // 20 + 5 views, 5 calls and clicks: 20 percent.
    expect(first.getByRole("link", { name: a!.title })).toBeTruthy()
    const cells = first.getAllByRole("cell").map((c) => c.textContent)
    expect(cells[0]).toContain(a!.title)
    // Below md the same numbers sit under the title.
    expect(cells[0]).toContain("25 views, 5 contacts, 20% conversion")
    expect(cells.slice(1)).toEqual(["25", "5", "20%"])
    expect(within(rows[1]!).getByRole("link", { name: b!.title })).toBeTruthy()
    // A listing nobody opened has no conversion.
    const unseen = rows.find(
      (r) => within(r).getAllByRole("cell")[1]?.textContent === "0"
    )
    expect(within(unseen!).getByLabelText("No views yet")).toBeTruthy()
  })

  it("a failed load shows one error with Retry", async () => {
    document.cookie = "mock_fail=500; Path=/"
    await open()
    expect(
      await screen.findByText("Could not load your analytics")
    ).toBeTruthy()
    document.cookie = "mock_fail=; Path=/; Max-Age=0"
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("table")).toBeTruthy()
  })
})

describe("workshop and mechanic analytics", () => {
  it("count profile views and new reviews, with no top listings", async () => {
    const owner = db.users.find(
      (u) => u.role === "workshop" && u.onboardingDone
    )!
    const shop = db.workshops.find((w) => w.ownerId === owner.id)!
    setEvents([shop.id], [[shop.id, 0, { view: 4, phone_click: 1 }]])
    await renderShell(<AnalyticsPage role="workshop" />, {
      role: "workshop",
      path: "/en/workshop/analytics",
    })
    await waitFor(async () =>
      expect((await card("Profile views")).textContent).toContain("4")
    )
    for (const name of ["Calls", "WhatsApp clicks", "Messages", "New reviews"])
      expect(screen.getByText(name)).toBeTruthy()
    expect(screen.queryByText("Favorites")).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("Top listings")).toBeNull()
  })

  it("a visit to the public profile adds one view to the owner's numbers, once per session", async () => {
    const owner = db.users.find(
      (u) => u.role === "workshop" && u.onboardingDone
    )!
    const shop = db.workshops.find((w) => w.ownerId === owner.id)!
    setEvents([shop.id], [])
    const visit = async () => {
      const { unmount } = await renderShell(
        <NowProvider serverNow={Date.UTC(2026, 9, 6, 10, 0)}>
          <Suspense fallback={null}>
            <WorkshopProfilePage
              slug={shop.slug}
              search={workshopProfileSearchSchema.parse({})}
            />
          </Suspense>
        </NowProvider>
      )
      await screen.findByRole("heading", { level: 1 })
      unmount()
    }
    await visit()
    await waitFor(() =>
      expect(db.events.find((e) => e.targetId === shop.id)?.counts.view).toBe(1)
    )
    await visit()
    expect(db.events.find((e) => e.targetId === shop.id)?.counts.view).toBe(1)
  })
})
