import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "@/features/auth/auth-flow-state"
import { authGate, closeAuthGate } from "@/features/auth/auth-gate"
import { AuthDialog } from "@/features/auth/components/auth-dialog"
import { AuthFlow } from "@/features/auth/components/auth-flow"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { redirectSearch, signInDestination } from "@/features/auth/destination"
import { userSchema } from "@/schemas/user"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

const identified = (exists: boolean) =>
  authReducer(initialAuthState, {
    type: "identified",
    identifier: "0912345678",
    normalizedIdentifier: "+249912345678",
    kind: "phone",
    exists,
  })

describe("authReducer", () => {
  it("goes to password for a known identifier and to create for a new one", () => {
    expect(identified(true).step).toBe("password")
    expect(identified(false).step).toBe("create")
  })

  it("keeps the typed identifier when going back", () => {
    const back = authReducer(identified(true), { type: "back" })
    expect(back.step).toBe("identifier")
    expect(back.identifier).toBe("0912345678")
    expect(back.normalizedIdentifier).toBe("+249912345678")
  })

  it("goes back from otp to the step it came from", () => {
    const otp = authReducer(identified(false), { type: "otp", from: "create" })
    expect(otp.step).toBe("otp")
    expect(authReducer(otp, { type: "back" }).step).toBe("create")
    const login = authReducer(identified(true), {
      type: "otp",
      from: "password",
    })
    expect(authReducer(login, { type: "back" }).step).toBe("password")
  })

  it("ignores back on the first step", () => {
    expect(authReducer(initialAuthState, { type: "back" })).toBe(
      initialAuthState
    )
  })
})

describe("signInDestination", () => {
  const user = (onboardingDone: boolean) => ({
    ...userSchema.parse(
      db.users.find((u) => u.role === "dealership" && u.onboardingDone)
    ),
    onboardingDone,
  })
  it("a new account does role selection first and keeps the redirect for the end", () => {
    expect(signInDestination(user(false), "/en/post", "en")).toBe(
      "/en/onboarding/role?redirect=%2Fen%2Fpost"
    )
  })
  it("prefers redirect, then the dashboard, then role selection", () => {
    expect(signInDestination(user(true), "/ar/post", "en")).toBe("/en/post")
    expect(signInDestination(user(true), undefined, "en")).toBe("/en/dealer")
    expect(signInDestination(user(false), undefined, "en")).toBe(
      "/en/onboarding/role"
    )
  })
  it("ignores an unsafe redirect param", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\t/evil.com"])
      expect(redirectSearch.parse({ redirect: bad }).redirect).toBeUndefined()
    expect(redirectSearch.parse({ redirect: "/en/post" }).redirect).toBe(
      "/en/post"
    )
  })
})

beforeEach(() => {
  resetDb()
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.stubGlobal("innerWidth", 1280)
})
afterEach(() => {
  closeAuthGate()
  vi.unstubAllGlobals()
})

describe("AuthHeader", () => {
  const step = (s: AuthState["step"], reason?: string) => {
    const dispatch = vi.fn()
    return {
      dispatch,
      ui: (
        <AuthHeader mode="page" step={s} reason={reason} dispatch={dispatch} />
      ),
    }
  }

  it("shows the stored reason as the identifier helper", async () => {
    await renderShell(step("identifier", "auth.reason_favorite").ui)
    expect(screen.getByText("Sign in to save this listing")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
  })

  it("shows a Back button after the first step", async () => {
    const { ui, dispatch } = step("password", "auth.reason_favorite")
    await renderShell(ui)
    expect(
      screen.getByRole("heading", { name: "Enter your password" })
    ).toBeTruthy()
    expect(screen.queryByText("Sign in to save this listing")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(dispatch).toHaveBeenCalledWith({ type: "back" })
  })
})

describe("AuthFlow", () => {
  it("renders the identifier step with legal links that open a new tab", async () => {
    await renderShell(<AuthFlow mode="page" onDone={() => {}} />)
    expect(
      screen.getByRole("heading", { name: "Sign in or create an account" })
    ).toBeTruthy()
    const terms = screen.getByRole("link", { name: "Terms" })
    expect(terms.getAttribute("href")).toBe("/en/terms")
    expect(terms.getAttribute("target")).toBe("_blank")
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy()
  })
})

describe("AuthDialog", () => {
  it("shows the gate reason and returns focus to the trigger on close", async () => {
    await renderShell(
      <>
        <button
          onClick={() =>
            authGate.setState(() => ({
              open: true,
              reason: "auth.reason_message",
              pending: null,
            }))
          }
        >
          trigger
        </button>
        <AuthDialog />
      </>
    )
    const trigger = screen.getByRole("button", { name: "trigger" })
    trigger.focus()
    fireEvent.click(trigger)
    expect(
      await screen.findByRole("dialog", {
        name: "Sign in or create an account",
      })
    ).toBeTruthy()
    expect(screen.getByText("Sign in to send a message")).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
