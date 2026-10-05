import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { IdentifierStep } from "@/features/auth/components/identifier-step"
import { initialAuthState } from "@/features/auth/auth-flow-state"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(() => {
  resetDb()
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.stubGlobal("innerWidth", 1280)
})

const setup = async () => {
  const onDone = vi.fn()
  await renderShell(
    <IdentifierStep
      state={initialAuthState}
      dispatch={vi.fn() as never}
      onDone={onDone}
      mode="page"
    />
  )
  return onDone
}

describe("MockOAuthDialog", () => {
  it("opens per provider and signs in the chosen account", async () => {
    const onDone = await setup()
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Choose a Google account",
    })
    expect(dialog).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Omar Hassan/ }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(db.users.some((u) => u.fullName === "Omar Hassan")).toBe(true)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("cancel closes it without signing in", async () => {
    const onDone = await setup()
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Facebook" })
    )
    await screen.findByRole("dialog", { name: "Choose a Facebook account" })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(onDone).not.toHaveBeenCalled()
  })
})
