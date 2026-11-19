import { act, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vitest"

import { Toaster, toast, toastError } from "@/components/ui/toast"
import { createI18n } from "@/lib/i18n/create"
import en from "@/messages/en/common.json"

describe("Toaster", () => {
  it("marks errors and offers a close button on every toast", async () => {
    render(
      <I18nextProvider i18n={createI18n("en", { common: en })}>
        <Toaster />
      </I18nextProvider>
    )
    act(() => {
      toast.add({ title: "Saved" })
      toastError({ title: "Failed" })
    })
    const failed = (await screen.findByText("Failed")).closest(
      "[data-slot=toast]"
    )
    const saved = screen.getByText("Saved").closest("[data-slot=toast]")
    expect(failed?.getAttribute("data-type")).toBe("error")
    expect(saved?.hasAttribute("data-type")).toBe(false)
    // Base UI keeps close aria-hidden until the stack is hovered or focused.
    expect(
      document.querySelectorAll('[data-slot=toast-close][aria-label="Close"]')
    ).toHaveLength(2)
  })
})
