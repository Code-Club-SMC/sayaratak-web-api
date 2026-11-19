import { Suspense } from "react"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContactActions } from "@/components/app/contact-actions"
import { ReportsPage } from "@/features/dealer-reports/components/reports-page"
import {
  analyticsSearchSchema,
  reportSearchSchema,
} from "@/features/analytics/schemas"
import { MechanicProfilePage } from "@/features/directory/components/mechanic-profile-page"
import { WorkshopProfilePage } from "@/features/directory/components/workshop-profile-page"
import { mechanicProfileSearchSchema } from "@/features/directory/mechanic-schemas"
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
// The Listings tab table; the contact heatmap is a table too.
const topTable = () =>
  screen.findByRole("table", { name: "Listings performance" })
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

describe("report period (step 11.7-r1)", () => {
  it("custom minutes and compare live in the URL; broken ones fall back", () => {
    expect(
      reportSearchSchema.parse({
        from: "2026-11-01T08:00",
        to: "2026-11-01T17:00",
        compare: "year",
      })
    ).toEqual({
      range: "30d",
      from: "2026-11-01T08:00",
      to: "2026-11-01T17:00",
      compare: "year",
    })
    expect(reportSearchSchema.parse({ from: "today" })).toMatchObject({
      from: undefined,
      compare: "previous",
    })
  })

  const openPage = (search = "") =>
    renderShell(<ReportsPage role="dealership" />, {
      role: "dealership",
      path: `/en/dealer/reports${search}`,
    })

  it("comparing with last year writes compare=year and relabels the change", async () => {
    const { router } = await openPage()
    await pick(
      await screen.findByRole("combobox", { name: "Compare with" }),
      "Same period last year"
    )
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ compare: "year" })
    )
  })

  it("a custom range with times shows its dates and the whole-hour note", async () => {
    await openPage(`?from=${day(1)}T08:30&to=${day(0)}T10:00`)
    expect(await screen.findByText(/counted per whole hour/)).toBeTruthy()
    // The end shows as sent: `to` is exclusive, only midnight reads as 23:59 of the day before.
    expect(
      screen.getByRole("button", { name: /8:30 AM.*10:00 AM/ })
    ).toBeTruthy()
  })

  it("a range of up to 2 days shows hour buckets (step 11.7-r2)", async () => {
    await openPage(`?from=${day(0)}T08:00&to=${day(0)}T11:00`)
    const views = await screen.findByRole("region", {
      name: "Listing views over time",
    })
    fireEvent.click(await within(views).findByRole("button", { name: "Table" }))
    const rows = within(within(views).getByRole("table")).getAllByRole("row")
    // Header plus 08:00, 09:00 and 10:00.
    expect(rows).toHaveLength(4)
    expect(rows[1]!.textContent).toMatch(/8:00/)
  })

  it("the contact heatmap names the busiest weekday and hour", async () => {
    const [a] = dealerListings()
    setEvents([a!.id], [[a!.id, 0, { phone_click: 24 }]])
    await openPage("?range=7d")
    const heat = await screen.findByRole("region", { name: "Contact times" })
    expect(await within(heat).findByText(/^Busiest: /)).toBeTruthy()
    expect(within(heat).getAllByRole("row")).toHaveLength(8)
  })

  it("a chart switches to a table of its buckets with the compare column", async () => {
    await openPage("?range=7d")
    const views = await screen.findByRole("region", {
      name: "Listing views over time",
    })
    fireEvent.click(await within(views).findByRole("button", { name: "Table" }))
    const table = within(views).getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(8)
    expect(within(table).getByText("Previous period")).toBeTruthy()
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
    return renderShell(<ReportsPage role="dealership" />, {
      role: "dealership",
      path: `/en/dealer/reports${search}`,
    })
  }

  it("shows the five dealership cards with numbers from today's events", async () => {
    await open()
    expect(
      screen.getByRole("heading", { level: 1, name: "Reports" })
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

  it("the Listings tab lists listings by views with their contact rate", async () => {
    db.messages = []
    await open("?tab=listings")
    const table = await topTable()
    const [a, b] = dealerListings()
    await waitFor(() =>
      expect(within(table).getAllByRole("row")[1]?.textContent).toContain(
        a!.title
      )
    )
    const rows = within(table).getAllByRole("row").slice(1)
    expect(rows.length).toBeLessThanOrEqual(20)
    const first = within(rows[0]!)
    // 20 + 5 views, 5 calls and clicks: 20 percent.
    const cells = first.getAllByRole("cell").map((c) => c.textContent)
    expect(cells.slice(3, 6)).toEqual(["25", "5", "20%"])
    expect(within(rows[1]!).getByRole("link", { name: b!.title })).toBeTruthy()
    // A listing nobody opened has no rate.
    const unseen = rows.find(
      (r) => within(r).getAllByRole("cell")[3]?.textContent === "0"
    )
    expect(within(unseen!).getByLabelText("No views yet")).toBeTruthy()
  })

  it("sorting and filtering write the address", async () => {
    const { router } = await open("?tab=listings")
    const table = await topTable()
    fireEvent.click(within(table).getByRole("button", { name: "Days live" }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ sort: "days_asc" })
    )
    fireEvent.click(screen.getByRole("radio", { name: /^Few photos/ }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        filter: "few_photos",
      })
    )
  })

  it("a call and a WhatsApp tap on a public listing raise its contacts", async () => {
    const [a] = dealerListings()
    setEvents(
      [dealerBiz().id, ...dealerListings().map((l) => l.id)],
      [[a!.id, 0, { view: 10 }]]
    )
    const visit = await renderShell(
      <ContactActions
        target={{ type: "listing", id: a!.id, title: a!.title }}
        phone="+249912345678"
        whatsapp="+249912345678"
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Call" }))
    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }))
    await waitFor(() =>
      expect(db.events.find((e) => e.targetId === a!.id)?.counts).toMatchObject(
        { phone_click: 1, whatsapp_click: 1 }
      )
    )
    visit.unmount()
    db.messages = []
    await renderShell(<ReportsPage role="dealership" />, {
      role: "dealership",
      path: "/en/dealer/reports?tab=listings",
    })
    const table = await topTable()
    await waitFor(() =>
      expect(
        within(within(table).getAllByRole("row")[1]!).getByRole("link", {
          name: a!.title,
        })
      ).toBeTruthy()
    )
    const row = within(table).getAllByRole("row")[1]!
    expect(
      within(row)
        .getAllByRole("cell")
        .slice(3, 6)
        .map((c) => c.textContent)
    ).toEqual(["10", "2", "20%"])
  })

  it("a failed load shows one error with Retry", async () => {
    document.cookie = "mock_fail=500; Path=/"
    await open()
    expect(
      await screen.findByText("Could not load your analytics")
    ).toBeTruthy()
    document.cookie = "mock_fail=; Path=/; Max-Age=0"
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await card("Listing views")).toBeTruthy()
  })
})

describe("workshop and mechanic analytics", () => {
  it("count profile views and new reviews, with no top listings", async () => {
    const owner = db.users.find(
      (u) => u.role === "workshop" && u.onboardingDone
    )!
    const shop = db.workshops.find((w) => w.ownerId === owner.id)!
    setEvents([shop.id], [[shop.id, 0, { view: 4, phone_click: 1 }]])
    await renderShell(<ReportsPage role="workshop" />, {
      role: "workshop",
      path: "/en/workshop/reports",
    })
    await waitFor(async () =>
      expect((await card("Profile views")).textContent).toContain("4")
    )
    for (const name of ["Calls", "WhatsApp clicks", "Messages", "New reviews"])
      expect(screen.getByText(name)).toBeTruthy()
    expect(screen.queryByText("Favorites")).toBeNull()
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
  it("a call and a WhatsApp tap on the public profile show in the owner's cards", async () => {
    const owner = db.users.find(
      (u) => u.role === "workshop" && u.onboardingDone
    )!
    const shop = db.workshops.find((w) => w.ownerId === owner.id)!
    setEvents([shop.id], [])
    const visit = await renderShell(
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
    fireEvent.click(screen.getAllByRole("button", { name: "Call" })[0]!)
    fireEvent.click(screen.getAllByRole("link", { name: "WhatsApp" })[0]!)
    await waitFor(() =>
      expect(
        db.events.find((e) => e.targetId === shop.id)?.counts
      ).toMatchObject({ phone_click: 1, whatsapp_click: 1 })
    )
    visit.unmount()
    await renderShell(<ReportsPage role="workshop" />, {
      role: "workshop",
      path: "/en/workshop/reports",
    })
    await waitFor(async () =>
      expect((await card("Calls")).textContent).toContain("1")
    )
    expect((await card("WhatsApp clicks")).textContent).toContain("1")
  })

  it("a call and a WhatsApp tap on a mechanic's public profile show in the mechanic's cards", async () => {
    const owner = db.users.find(
      (u) => u.role === "mechanic" && u.onboardingDone
    )!
    const mechanic = db.mechanics.find((m) => m.ownerId === owner.id)!
    setEvents([mechanic.id], [])
    const visit = await renderShell(
      <NowProvider serverNow={Date.UTC(2026, 9, 6, 10, 0)}>
        <Suspense fallback={null}>
          <MechanicProfilePage
            slug={mechanic.slug}
            search={mechanicProfileSearchSchema.parse({})}
          />
        </Suspense>
      </NowProvider>
    )
    await screen.findByRole("heading", { level: 1 })
    fireEvent.click(screen.getAllByRole("button", { name: "Call" })[0]!)
    fireEvent.click(screen.getAllByRole("link", { name: "WhatsApp" })[0]!)
    await waitFor(() =>
      expect(
        db.events.find((e) => e.targetId === mechanic.id)?.counts
      ).toMatchObject({ view: 1, phone_click: 1, whatsapp_click: 1 })
    )
    visit.unmount()
    await renderShell(<ReportsPage role="mechanic" />, {
      role: "mechanic",
      path: "/en/mechanic/reports",
    })
    await waitFor(async () =>
      expect((await card("Calls")).textContent).toContain("1")
    )
    expect((await card("WhatsApp clicks")).textContent).toContain("1")
    expect((await card("Profile views")).textContent).toContain("1")
  })
})
