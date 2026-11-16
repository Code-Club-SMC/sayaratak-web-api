import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SeedNotice } from "@/components/app/seed-notice"
import { renderShell } from "./shell-render"

describe("SeedNotice", () => {
  it("renders nothing when inactive", async () => {
    await renderShell(<SeedNotice active={false} />)
    expect(screen.queryByTestId("seed-notice")).toBeNull()
  })

  it("renders passive readable text without alert role when active", async () => {
    await renderShell(<SeedNotice active={true} />, { locale: "en" })
    const notice = screen.getByTestId("seed-notice")
    expect(notice).not.toBeNull()
    expect(notice.getAttribute("role")).toBeNull()
    expect(notice.textContent).toBe(
      "Demo data. Contact and payments are unavailable for these listings."
    )
  })

  it("renders Arabic text when locale is ar", async () => {
    await renderShell(<SeedNotice active={true} />, { locale: "ar" })
    const notice = screen.getByTestId("seed-notice")
    expect(notice).not.toBeNull()
    expect(notice.textContent).toBe(
      "بيانات تجريبية. الاتصال والدفع غير متاحين لهذه الإعلانات."
    )
  })
})
