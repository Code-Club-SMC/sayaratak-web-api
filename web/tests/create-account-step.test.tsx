import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "@/features/auth/auth-flow-state"
import { CreateAccountStep } from "@/features/auth/components/create-account-step"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(resetDb)
afterEach(() => vi.unstubAllEnvs())

const identified = (identifier: string, kind: "phone" | "email"): AuthState =>
  authReducer(initialAuthState, {
    type: "identified",
    identifier,
    normalizedIdentifier: identifier,
    kind,
    exists: false,
  })

const setup = async (state = identified("new@example.com", "email")) => {
  const dispatch = vi.fn()
  const onDone = vi.fn()
  await renderShell(
    <CreateAccountStep
      state={state}
      dispatch={dispatch}
      onDone={onDone}
      mode="page"
    />
  )
  return { dispatch, onDone }
}
const fill = (name: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: name },
  })
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole("button", { name: "Create account" }))
}

describe("CreateAccountStep", () => {
  it("validates both fields", async () => {
    await setup()
    fill("", "short")
    expect(await screen.findByText("Enter at least 2 characters")).toBeTruthy()
  })

  it("updates the password checks live", async () => {
    await setup()
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "abcdefg1" },
    })
    expect(screen.getAllByText("met").length).toBe(3)
  })

  it("creates an email account and finishes", async () => {
    const { onDone } = await setup()
    fill("Sara Ahmed", "Secret123")
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(db.users.some((u) => u.email === "new@example.com")).toBe(true)
  })

  it("goes to the OTP step for a phone when the flag is on", async () => {
    vi.stubEnv("VITE_FEATURE_OTP", "true")
    const { dispatch, onDone } = await setup(identified("0912345699", "phone"))
    fill("Sara Ahmed", "Secret123")
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "otp", from: "create" })
      )
    )
    expect(onDone).not.toHaveBeenCalled()
  })

  it("returns to the password step when the account already exists", async () => {
    const { dispatch } = await setup(identified("0912345601", "phone"))
    fill("Sara Ahmed", "Secret123")
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "identified", exists: true })
      )
    )
  })

  it("opens the legal links in a new tab", async () => {
    await setup()
    expect(
      screen.getByRole("link", { name: "Terms" }).getAttribute("target")
    ).toBe("_blank")
    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("target")
    ).toBe("_blank")
  })
})
