export type AuthStep = "identifier" | "password" | "create" | "otp"
type OtpFrom = "password" | "create"

export type AuthState = {
  step: AuthStep
  // What the person typed, kept so Back never clears the field.
  identifier: string
  normalizedIdentifier: string
  kind: "phone" | "email"
  pendingUserId?: string
  otpFrom?: OtpFrom
}

export type AuthAction =
  | {
      type: "identified"
      identifier: string
      normalizedIdentifier: string
      kind: AuthState["kind"]
      exists: boolean
    }
  | { type: "otp"; from: OtpFrom; pendingUserId?: string }
  | { type: "back" }

export const initialAuthState: AuthState = {
  step: "identifier",
  identifier: "",
  normalizedIdentifier: "",
  kind: "email",
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "identified":
      return {
        step: action.exists ? "password" : "create",
        identifier: action.identifier,
        normalizedIdentifier: action.normalizedIdentifier,
        kind: action.kind,
      }
    case "otp":
      return {
        ...state,
        step: "otp",
        otpFrom: action.from,
        pendingUserId: action.pendingUserId,
      }
    case "back":
      if (state.step === "identifier") return state
      return {
        ...state,
        step: state.step === "otp" ? (state.otpFrom ?? "create") : "identifier",
        pendingUserId: undefined,
        otpFrom: undefined,
      }
  }
}
