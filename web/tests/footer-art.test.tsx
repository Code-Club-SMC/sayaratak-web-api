import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FooterArt } from "@/components/app/footer-art"
import { FooterSocials } from "@/components/app/footer-socials"
import { renderShell } from "./shell-render"

describe("footer visual and social links", () => {
  it("keeps the uppercase wordmark separate from the decorative car", async () => {
    const { container } = await renderShell(<FooterArt />)
    expect(screen.getByText("SAYARATAK")).toBeDefined()
    const image = container.querySelector("img")
    expect(image?.alt).toBe("")
    expect(image?.getAttribute("loading")).toBe("lazy")
    expect(container.querySelector("source")?.getAttribute("type")).toBe(
      "image/webp"
    )
    expect(image?.closest('[aria-hidden="true"]')).not.toBeNull()
    if (!image) throw new Error("Expected decorative car")
    fireEvent.error(image)
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("SAYARATAK")).toBeDefined()
  })

  it("does not load the car when data saver is enabled", async () => {
    const { container } = await renderShell(<FooterArt />, {
      prefs: { dataSaver: true, listingView: "grid" },
    })
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("SAYARATAK")).toBeDefined()
  })

  it("provides translated social names without changing destinations", async () => {
    await renderShell(<FooterSocials whatsapp="+249123456789" />, {
      locale: "ar",
    })
    expect(
      screen.getByRole("link", { name: "فيسبوك" }).getAttribute("href")
    ).toBe("https://facebook.com")
    expect(screen.getByRole("link", { name: "إكس" })).toBeDefined()
    expect(screen.getByRole("link", { name: "إنستغرام" })).toBeDefined()
    expect(screen.getByRole("link", { name: "يوتيوب" })).toBeDefined()
    expect(
      screen.getByRole("link", { name: "واتساب" }).getAttribute("href")
    ).toBe("https://wa.me/249123456789")
  })
})
