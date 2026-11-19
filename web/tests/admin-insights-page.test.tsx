import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InsightsPage } from "@/features/admin-insights/components/insights-page"
import { insightsSearchSchema } from "@/features/admin-insights/schemas"
import { resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

// Step 11.7-r10: the admin Insights page on the seed.
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

const open = (query = "") =>
  renderShell(<InsightsPage />, {
    role: "admin",
    path: `/en/admin/insights${query}`,
  })

describe("admin insights", () => {
  it("has the Marketplace, Users, Revenue, Trust & safety, Ads and Search demand tabs, Marketplace first", async () => {
    await open()
    const tabs = within(await screen.findByRole("tablist")).getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Marketplace",
      "Users",
      "Revenue",
      "Trust & safety",
      "Ads",
      "Search demand",
    ])
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true")
  })

  it("Marketplace shows stock, lifecycle and the typical price table", async () => {
    await open()
    expect(await screen.findByText("Contacted in first week")).toBeTruthy()
    expect(
      screen.getByRole("heading", {
        name: "Where this period's listings are now",
      })
    ).toBeTruthy()
    expect(
      await screen.findByRole("columnheader", { name: /Typical price/ })
    ).toBeTruthy()
  })

  it("Users shows active accounts, devices and languages", async () => {
    await open("?tab=users")
    expect(await screen.findByText("Active in 30 days")).toBeTruthy()
    expect(await screen.findByText("Phone browser")).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: "Account language" })
    ).toBeTruthy()
  })

  it("Revenue shows money, renewal, plans and plans ending soon (step 11.7-r11)", async () => {
    await open("?tab=revenue")
    expect(await screen.findByText("Average per paying business")).toBeTruthy()
    expect(screen.getByText("Renewal rate")).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: "Plan money by plan" })
    ).toBeTruthy()
    const ending = screen.getByRole("heading", {
      name: "Paid plans ending in 30 days",
    })
    expect(ending).toBeTruthy()
    // The seed dealer's plan ends within 30 days; the link opens its business sheet.
    const link = await screen.findByRole("link", { name: "Al Nasr Motors" })
    expect(link.getAttribute("href")).toBe("/en/admin/dealerships?id=d-1")
  })

  it("Trust & safety shows the queue, reasons and flagged reviews (step 11.7-r12a)", async () => {
    await open("?tab=trust")
    expect(await screen.findByText("Listings waiting for review")).toBeTruthy()
    expect(screen.getByText("Time to decide a flag")).toBeTruthy()
    const reasons = screen.getByRole("region", {
      name: "Why listings were rejected",
    })
    // Seed rejections carry codes derived from their reason text.
    expect(await within(reasons).findByText("Unclear photos")).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: "Review queue by wait" })
    ).toBeTruthy()
  })

  it("Ads shows click rate, slot fill per page and the ads of the period (step 11.7-r12b)", async () => {
    await open("?tab=ads")
    expect(await screen.findByText("Paid slots filled")).toBeTruthy()
    expect(screen.getByText("Campaign click rate")).toBeTruthy()
    const pages = screen.getByRole("region", { name: "Slot fill by page" })
    expect(await within(pages).findByText("Home, top banner")).toBeTruthy()
    expect(
      screen.getByRole("region", { name: "Ads in this period" })
    ).toBeTruthy()
  })

  it("Search demand shows searches, makes against live listings and misses (step 11.7-r13)", async () => {
    await open("?tab=search")
    expect(await screen.findByText("No-result rate")).toBeTruthy()
    const makes = screen.getByRole("region", { name: "Most searched makes" })
    expect(
      await within(makes).findByRole("columnheader", {
        name: "Searches per listing",
      })
    ).toBeTruthy()
    expect(
      screen.getByRole("region", { name: "Searches that found nothing" })
    ).toBeTruthy()
  })
})

it("insightsSearchSchema: an unknown tab or range falls back", () => {
  expect(insightsSearchSchema.parse({ tab: "nope", range: "x" })).toMatchObject(
    {
      tab: "marketplace",
      range: "30d",
      compare: "previous",
    }
  )
})
