import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { authReducer, initialAuthState } from "@/features/auth/auth-flow-state"
import { PasswordStep } from "@/features/auth/components/password-step"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(resetDb)
afterEach(() => vi.unstubAllEnvs())

const state = authReducer(initialAuthState, {
  type: "identified",
  identifier: "0912345601",
  normalizedIdentifier: "+249912345601",
  kind: "phone",
  exists: true,
})

const setup = async () => {
  const dispatch = vi.fn()
  const onDone = vi.fn()
  await renderShell(
    <PasswordStep
      state={state}
      dispatch={dispatch}
      onDone={onDone}
      mode="page"
    />
  )
  return { dispatch, onDone }
}
const signIn = (password: string) => {
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("PasswordStep", () => {
  it("shows the identifier and goes back on Change", async () => {
    const { dispatch } = await setup()
    expect(screen.getByText("0912345601")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Change" }))
    expect(dispatch).toHaveBeenCalledWith({ type: "back" })
  })

  it("requires a password", async () => {
    await setup()
    signIn("")
    expect(await screen.findByText("This field is required")).toBeTruthy()
  })

  it("keeps the identifier and clears the field after a wrong password", async () => {
    const { onDone } = await setup()
    signIn("Wrong1234")
    expect(
      await screen.findByText("The phone, email or password is not correct")
    ).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>("Password").value).toBe("")
    expect(screen.getByText("0912345601")).toBeTruthy()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("signs in with the right password", async () => {
    const { onDone } = await setup()
    signIn("Demo1234")
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it("locks the form with a countdown after too many attempts", async () => {
    await setup()
    for (let i = 1; i <= 5; i++) {
      signIn("Wrong1234")
      await waitFor(() =>
        expect(db.attempts.get("+249912345601")?.length).toBe(i)
      )
      await waitFor(() =>
        expect(
          screen
            .getByRole("button", { name: "Sign in" })
            .getAttribute("aria-busy")
        ).toBe("false")
      )
    }
    signIn("Wrong1234")
    expect(await screen.findByText(/Too many attempts/)).toBeTruthy()
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Sign in" })
        .disabled
    ).toBe(true)
  })

  it("shows the suspended message with a support link", async () => {
    const user = db.users.find((u) => u.phone === "+249912345601")
    if (user) user.banned = true
    await setup()
    signIn("Demo1234")
    expect(await screen.findByText(/This account is suspended/)).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Contact support" }).getAttribute("href")
    ).toBe("/en/contact")
  })

  it("links to forgot password and hides the code button without the flag", async () => {
    await setup()
    expect(
      screen
        .getByRole("link", { name: "Forgot password?" })
        .getAttribute("href")
    ).toBe("/en/auth/forgot")
    expect(
      screen.queryByRole("button", { name: "Send me a code instead" })
    ).toBeNull()
  })

  it("offers a code when VITE_FEATURE_OTP is true", async () => {
    vi.stubEnv("VITE_FEATURE_OTP", "true")
    const { dispatch } = await setup()
    fireEvent.click(
      screen.getByRole("button", { name: "Send me a code instead" })
    )
    expect(dispatch).toHaveBeenCalledWith({ type: "otp", from: "password" })
  })
})
