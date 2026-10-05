import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authReducer, initialAuthState } from "@/features/auth/auth-flow-state"
import { OtpStep } from "@/features/auth/components/otp-step"
import { resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

// jsdom lacks it; input-otp polls it for password-manager badges.
document.elementFromPoint = () => null

beforeEach(resetDb)

const state = authReducer(
  authReducer(initialAuthState, {
    type: "identified",
    identifier: "0912345601",
    normalizedIdentifier: "+249912345601",
    kind: "phone",
    exists: true,
  }),
  { type: "otp", from: "password" }
)

const setup = async () => {
  const dispatch = vi.fn()
  const onDone = vi.fn()
  await renderShell(
    <OtpStep state={state} dispatch={dispatch} onDone={onDone} mode="page" />
  )
  return { dispatch, onDone, input: screen.getByLabelText("Verification code") }
}
const type = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } })

describe("OtpStep", () => {
  it("signs in on the right code, typed with Arabic digits", async () => {
    const { onDone, input } = await setup()
    type(input, "١٢٣٤٥٦")
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it("rejects a wrong code, then locks after three", async () => {
    const { onDone, input } = await setup()
    type(input, "111111")
    expect(await screen.findByText("The code is not correct")).toBeTruthy()
    await waitFor(() => expect(input.hasAttribute("disabled")).toBe(false))
    type(input, "222222")
    await waitFor(() => expect(input.hasAttribute("disabled")).toBe(false))
    type(input, "333333")
    expect(await screen.findByText(/Too many attempts/)).toBeTruthy()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("counts down before a new code can be sent", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await setup()
    const resend = screen.getByRole("button", { name: /Send a new code in/ })
    expect(resend.hasAttribute("disabled")).toBe(true)
    // The countdown re-arms a timer each second, so tick one second at a time.
    for (let i = 0; i < 30; i++)
      await act(() => vi.advanceTimersByTimeAsync(1000))
    const ready = screen.getByRole("button", { name: "Send a new code" })
    expect(ready.hasAttribute("disabled")).toBe(false)
    fireEvent.click(ready)
    expect(
      await screen.findByRole("button", { name: /Send a new code in/ })
    ).toBeTruthy()
    vi.useRealTimers()
  })

  it("goes back twice for a different number", async () => {
    const { dispatch } = await setup()
    fireEvent.click(
      screen.getByRole("button", { name: "Use a different phone or email" })
    )
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})
