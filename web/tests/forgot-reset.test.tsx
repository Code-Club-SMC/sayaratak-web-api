import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ForgotForm } from "@/features/auth/components/forgot-form"
import { ResetForm } from "@/features/auth/components/reset-form"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(resetDb)
afterEach(() => vi.unstubAllEnvs())

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe("ForgotForm", () => {
  it("shows the same message for any account and the demo hint only in demo", async () => {
    vi.stubEnv("VITE_DEMO", "true")
    await renderShell(<ForgotForm />)
    type("Phone or email", "nobody@example.com")
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))
    expect(
      await screen.findByText(
        "If this account exists, we sent a way to reset the password."
      )
    ).toBeTruthy()
    expect(
      screen.getByText("Demo: open /auth/reset?token=demo-reset")
    ).toBeTruthy()
    expect(screen.getByRole("link", { name: "Back to sign in" })).toBeTruthy()
  })

  it("rejects an empty identifier", async () => {
    await renderShell(<ForgotForm />)
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(db.resetUserId).toBeNull()
  })
})

describe("ResetForm", () => {
  it("saves the new password for the account named by the last forgot request", async () => {
    const dealer = db.users.find((u) => u.email === "dealer@demo.sy")!
    db.resetUserId = dealer.id
    await renderShell(<ResetForm token="demo-reset" />)
    type("New password", "Newpass123")
    fireEvent.click(screen.getByRole("button", { name: "Save password" }))
    await waitFor(() => expect(dealer.password).toBe("Newpass123"))
  })

  it("shows the invalid state for a missing or wrong token", async () => {
    await renderShell(<ResetForm />)
    expect(
      screen.getByText("This reset link is not valid or has expired.")
    ).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Request a new link" })
    ).toBeTruthy()
  })

  it("switches to the invalid state when the server refuses the token", async () => {
    await renderShell(<ResetForm token="wrong" />)
    type("New password", "Newpass123")
    fireEvent.click(screen.getByRole("button", { name: "Save password" }))
    expect(
      await screen.findByText("This reset link is not valid or has expired.")
    ).toBeTruthy()
  })

  it("validates the password rules", async () => {
    await renderShell(<ResetForm token="demo-reset" />)
    type("New password", "short")
    fireEvent.click(screen.getByRole("button", { name: "Save password" }))
    expect(await screen.findByText("Use at least 8 characters")).toBeTruthy()
  })
})
