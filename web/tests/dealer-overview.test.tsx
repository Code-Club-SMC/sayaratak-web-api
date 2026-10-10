import { screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DealerOverviewPage } from "@/features/dealer-overview/components/dealer-overview-page"
import { NowProvider } from "@/lib/now"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

Element.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}
document.elementFromPoint = () => null

beforeEach(() => {
  resetDb()
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

const DAY = 24 * 60 * 60 * 1000
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString()
const dealer = () =>
  db.users.find((u) => u.role === "dealership" && u.onboardingDone)!
const mine = () => db.listings.filter((l) => l.ownerUserId === dealer().id)

const open = (path = "/en/dealer") =>
  renderShell(
    <NowProvider serverNow={Date.now()}>
      <DealerOverviewPage />
    </NowProvider>,
    { role: "dealership", path }
  )
// The funnel repeats some labels; the stat card is the one inside a link.
const cardLink = async (label: string) =>
  (await screen.findAllByText(label)).map((e) => e.closest("a")).find(Boolean)!

describe("DealerOverviewPage", () => {
  it("links every number to the page that explains it, keeping the range", async () => {
    await open("/en/dealer?range=7d")
    const hrefs = {
      "Active vehicles": "/en/dealer/inventory?tab=active",
      "Listing views": "/en/dealer/analytics?range=7d",
      Contacts: "/en/dealer/analytics?range=7d",
      "Unread messages": "/en/dealer/messages",
      Rating: "/en/dealer/reviews",
    }
    for (const [label, href] of Object.entries(hrefs)) {
      const link = await cardLink(label)
      expect(link.getAttribute("href")).toBe(href)
      await waitFor(() =>
        expect(within(link).queryAllByText(/^\d/).length).toBeGreaterThan(0)
      )
    }
  })

  it("shows the funnel with the period's totals", async () => {
    await open()
    const funnel = (await screen.findByText("From views to messages")).closest(
      "section"
    )!
    const items = await within(funnel).findAllByRole("listitem")
    expect(
      items.map((i) => i.firstElementChild?.firstChild?.textContent)
    ).toEqual(["Views", "Contacts", "Messages"])
  })

  it("lists pending and rejected vehicles with an edit link to the dealer wizard", async () => {
    for (const l of mine()) {
      Object.assign(l, {
        moderation: "approved",
        status: "available",
        expiresAt: iso(60),
        updatedAt: iso(0),
      })
    }
    const [pending, rejected] = mine()
    pending!.moderation = "pending"
    Object.assign(rejected!, {
      moderation: "rejected",
      rejectionReason: "Wrong price",
    })
    await open()
    const row = async (title: string) =>
      (await screen.findByText(title)).closest("li")!
    const p = await row(pending!.title)
    expect(within(p).getByText("Pending review")).toBeTruthy()
    expect(
      within(p).getByRole("link", { name: "Edit" }).getAttribute("href")
    ).toBe(`/en/dealer/inventory/${pending!.id}/edit`)
    expect(
      within(await row(rejected!.title))
        .getByRole("link", { name: "Edit and resubmit" })
        .getAttribute("href")
    ).toBe(`/en/dealer/inventory/${rejected!.id}/edit`)
  })
})
