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
  it("has the Marketplace and Users tabs, Marketplace first", async () => {
    await open()
    const tabs = within(await screen.findByRole("tablist")).getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Marketplace", "Users"])
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
