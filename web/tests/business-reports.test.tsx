import { screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReportsPage } from "@/features/dealer-reports/components/reports-page"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

// Step 11.7-r8: workshop and mechanic Reports (Performance, Ads, Replies, Reviews, Rank).
Element.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

beforeEach(() => {
  resetDb()
  sessionStorage.clear()
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

const open = (role: "workshop" | "mechanic", query = "") =>
  renderShell(<ReportsPage role={role} />, {
    role,
    path: `/en/${role}/reports${query}`,
  })

describe("workshop and mechanic reports", () => {
  it("show their five tabs and none of the dealer's", async () => {
    await open("workshop")
    const tabs = within(await screen.findByRole("tablist"))
      .getAllByRole("tab")
      .map((tab) => tab.textContent)
    expect(tabs).toEqual(["Performance", "Ads", "Replies", "Reviews", "Rank"])
  })

  it("a dealer tab in the link opens Performance", async () => {
    await open("mechanic", "?tab=listings")
    const tab = await screen.findByRole("tab", { name: "Performance" })
    expect(tab.getAttribute("aria-selected")).toBe("true")
  })

  it("Rank compares with all Sudan when the city has under 5, and ranks views", async () => {
    await open("workshop", "?tab=rank")
    expect(
      await screen.findByText(/workshops in all Sudan, you included/)
    ).toBeTruthy()
    for (const name of [
      "Profile views",
      "Contacts",
      "Rating",
      "Answered within 24 hours",
    ])
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.getAllByText(/Better than \d+%/).length).toBeGreaterThan(0)
    )
  })

  it("Ads with no campaign offers to start one", async () => {
    const owner = db.users.find(
      (u) => u.role === "mechanic" && u.onboardingDone
    )!
    db.campaigns = db.campaigns.filter((c) => c.ownerId !== owner.id)
    await open("mechanic", "?tab=ads")
    expect(
      await screen.findByText("No banner campaigns ran in this period")
    ).toBeTruthy()
    const link = screen.getByRole("link", { name: "New campaign" })
    expect(link.getAttribute("href")).toBe("/en/mechanic/ads/new")
  })

  it("Replies speak of customers", async () => {
    await open("workshop", "?tab=replies")
    expect(await screen.findByText("New customer messages")).toBeTruthy()
  })
})
