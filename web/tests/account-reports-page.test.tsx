import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReportsPage } from "@/features/dealer-reports/components/reports-page"
import { resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

// Step 11.7-r9: the personal seller's Reports (u-omar in the seed: receipts and saved searches).
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
  renderShell(<ReportsPage role="user" />, {
    role: "user",
    path: `/en/account/reports${query}`,
  })

describe("personal reports", () => {
  it("show the seven personal tabs", async () => {
    await open()
    const tabs = within(await screen.findByRole("tablist"))
      .getAllByRole("tab")
      .map((tab) => tab.textContent)
    expect(tabs).toEqual([
      "Performance",
      "Listings",
      "Price",
      "Promotions",
      "Replies",
      "Spending",
      "Alerts",
    ])
  })

  it("a business tab in the link opens Performance", async () => {
    await open("?tab=rank")
    const tab = await screen.findByRole("tab", { name: "Performance" })
    expect(tab.getAttribute("aria-selected")).toBe("true")
  })

  it("Spending lists the period's receipts by state", async () => {
    await open("?tab=spending")
    expect(await screen.findByText("Receipts in this period")).toBeTruthy()
    for (const name of ["Paid", "Waiting for review", "Rejected"])
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
  })

  it("Alerts lists each saved search with a link to its results", async () => {
    await open("?tab=alerts")
    expect(await screen.findByText("Your saved searches")).toBeTruthy()
    expect(
      (await screen.findAllByRole("link", { name: /^Open/ })).length
    ).toBeGreaterThan(0)
  })

  it("Promotions has no banner campaigns for a personal seller", async () => {
    await open("?tab=promotions")
    expect(
      await screen.findByRole("heading", { name: "Promotions" })
    ).toBeTruthy()
    expect(screen.queryByText("Banner campaigns")).toBeNull()
  })
})
