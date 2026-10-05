import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { initialAuthState } from "@/features/auth/auth-flow-state"
import { IdentifierStep } from "@/features/auth/components/identifier-step"
import {
  identifierKind,
  looksLikePhone,
  normalizeIdentifier,
} from "@/features/auth/identifier"
import { resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(() => {
  resetDb()
  // The social account dialog reads the viewport through useIsMobile.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("identifier helpers", () => {
  it("detects and normalizes phone and email", () => {
    expect(looksLikePhone("0912 345 678")).toBe(true)
    expect(looksLikePhone("٠٩١٢٣٤٥٦٧٨")).toBe(true)
    expect(looksLikePhone("omar@x.com")).toBe(false)
    expect(identifierKind("omar@x.com")).toBe("email")
    expect(normalizeIdentifier(" Omar@X.com ")).toBe("omar@x.com")
    expect(normalizeIdentifier("0912345678")).toBe("+249912345678")
  })
})

describe("IdentifierStep", () => {
  const setup = async () => {
    const dispatch = vi.fn()
    const onDone = vi.fn()
    await renderShell(
      <IdentifierStep
        state={initialAuthState}
        dispatch={dispatch}
        onDone={onDone}
        mode="page"
      />
    )
    return { dispatch, onDone }
  }
  const type = (value: string) => {
    fireEvent.change(screen.getByLabelText("Phone or email"), {
      target: { value },
    })
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  }

  it("shows the +249 chip only for phone-like input", async () => {
    await setup()
    const input = screen.getByLabelText("Phone or email")
    expect(screen.queryByText("+249")).toBeNull()
    fireEvent.change(input, { target: { value: "0912345678" } })
    expect(screen.getByText("+249")).toBeTruthy()
    fireEvent.change(input, { target: { value: "omar@x.com" } })
    expect(screen.queryByText("+249")).toBeNull()
  })

  it("rejects an invalid identifier with the localized error", async () => {
    const { dispatch } = await setup()
    type("abc")
    expect(
      await screen.findByText("Enter a phone number or an email")
    ).toBeTruthy()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("sends a known account to the password step", async () => {
    const { dispatch } = await setup()
    type("0912345601")
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: "identified",
        identifier: "0912345601",
        normalizedIdentifier: "+249912345601",
        kind: "phone",
        exists: true,
      })
    )
  })

  it("sends an unknown email to the create step", async () => {
    const { dispatch } = await setup()
    type("nobody@x.com")
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "email", exists: false })
      )
    )
  })

  it("lists demo accounts only when VITE_DEMO is true", async () => {
    await setup()
    expect(
      screen.queryByRole("button", { name: "Sign in as demo admin" })
    ).toBeNull()
    vi.stubEnv("VITE_DEMO", "true")
    const { onDone } = await setup()
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in as demo admin" })
    )
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })
})
