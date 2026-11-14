import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthCarousel } from "@/components/app/auth-panel/auth-carousel"
import { renderShell } from "./shell-render"

afterEach(() => vi.unstubAllGlobals())

describe("auth carousel previews", () => {
  it("uses a readable vector analytics preview instead of an oversized screenshot", async () => {
    const { container } = await renderShell(<AuthCarousel />)
    expect(
      container.querySelector('img[src*="/images/auth/analytics-"]')
    ).toBeNull()
    expect(container.querySelector("svg path.stroke-primary")).not.toBeNull()
    expect(screen.getByText("28,144")).toBeDefined()
  })

  it("keeps every slide selectable and pause/play operable", async () => {
    await renderShell(<AuthCarousel />)
    for (const number of [1, 2, 3, 4]) {
      const dot = screen.getByRole("button", {
        name: `Go to slide ${number}`,
      })
      fireEvent.click(dot)
      expect(dot.getAttribute("aria-current")).toBe("true")
    }
    fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }))
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeDefined()
  })

  it("does not load preview photos in data saver mode", async () => {
    const { container } = await renderShell(<AuthCarousel />, {
      prefs: { dataSaver: true, listingView: "grid" },
    })
    expect(container.querySelector("img")).toBeNull()
  })

  it("starts paused when reduced motion is preferred", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    await renderShell(<AuthCarousel />)
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeDefined()
  })
})
