import { queryOptions, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys, publicKeyRoots } from "@/lib/api/query-keys"
import {
  draftSchema,
  identifySchema,
  notificationPrefsSchema,
  okSchema,
  type NotificationPrefs,
} from "@/schemas/api"
import type { z } from "zod"
import type {
  forgotInputSchema,
  identifyInputSchema,
  loginInputSchema,
  oauthInputSchema,
  otpSendInputSchema,
  otpVerifyInputSchema,
  passwordInputSchema,
  profilePatchSchema,
  registerInputSchema,
  resetInputSchema,
} from "@/schemas/inputs"
import { userSchema, type User } from "@/schemas/user"

export { meQuery } from "./me-query"
export const prefsQuery = queryOptions({
  queryKey: keys.prefs,
  queryFn: ({ signal }) =>
    apiFetch("/me/notification-prefs", {
      schema: notificationPrefsSchema,
      signal,
    }),
})
export const draftQuery = (key: string) =>
  queryOptions({
    queryKey: keys.drafts(key),
    queryFn: ({ signal }) =>
      apiFetch(`/drafts/${key}`, { schema: draftSchema, signal }),
    staleTime: 0,
  })

// After sign in the cache holds the user and personal queries refetch.
function useSignedIn() {
  const qc = useQueryClient()
  return (user: User) => {
    qc.setQueryData(keys.me, user)
    void qc.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== "me" && q.queryKey[0] !== "taxonomy",
    })
    return user
  }
}
const post =
  <TSchema extends z.ZodType>(path: string, schema: TSchema) =>
  (body?: unknown) =>
    apiFetch(path, { method: "POST", body, schema })

export const useIdentify = () =>
  useApiMutation((body: z.input<typeof identifyInputSchema>) =>
    post("/auth/identify", identifySchema)(body)
  )
export function useLogin() {
  const signedIn = useSignedIn()
  return useApiMutation((body: z.input<typeof loginInputSchema>) =>
    post("/auth/login", userSchema)(body).then(signedIn)
  )
}
export function useRegister() {
  const signedIn = useSignedIn()
  return useApiMutation((body: z.input<typeof registerInputSchema>) =>
    post("/auth/register", userSchema)(body).then(signedIn)
  )
}
export function useOauthLogin() {
  const signedIn = useSignedIn()
  return useApiMutation(
    (
      v: { provider: "google" | "facebook" } & z.input<typeof oauthInputSchema>
    ) =>
      post(
        `/auth/oauth/${v.provider}`,
        userSchema
      )({ accountId: v.accountId }).then(signedIn)
  )
}
export const useSendOtp = () =>
  useApiMutation((body: z.input<typeof otpSendInputSchema>) =>
    post("/auth/otp/send", okSchema)(body)
  )
export function useVerifyOtp() {
  const qc = useQueryClient()
  return useApiMutation((body: z.input<typeof otpVerifyInputSchema>) =>
    post(
      "/auth/otp/verify",
      userSchema.or(okSchema)
    )(body).then((r) => {
      if ("id" in r) qc.setQueryData(keys.me, r)
      return r
    })
  )
}
export const useForgotPassword = () =>
  useApiMutation((body: z.input<typeof forgotInputSchema>) =>
    post("/auth/forgot", okSchema)(body)
  )
export const useResetPassword = () =>
  useApiMutation((body: z.input<typeof resetInputSchema>) =>
    post("/auth/reset", okSchema)(body)
  )

function useSignedOut() {
  const qc = useQueryClient()
  return () => {
    qc.setQueryData(keys.me, null)
    qc.removeQueries({
      predicate: (q) =>
        !publicKeyRoots.has(String(q.queryKey[0])) && q.queryKey[0] !== "me",
    })
  }
}
export function useLogout() {
  const signedOut = useSignedOut()
  return useApiMutation(() => post("/auth/logout", okSchema)().then(signedOut))
}
export function useDeleteAccount() {
  const signedOut = useSignedOut()
  return useApiMutation(() =>
    apiFetch("/me", { method: "DELETE", schema: okSchema }).then(signedOut)
  )
}
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useApiMutation((body: z.input<typeof profilePatchSchema>) =>
    apiFetch("/me", { method: "PATCH", body, schema: userSchema }).then((u) => {
      qc.setQueryData(keys.me, u)
      return u
    })
  )
}
export const useChangePassword = () =>
  useApiMutation((body: z.input<typeof passwordInputSchema>) =>
    post("/me/password", okSchema)(body)
  )
export function useUpdateNotificationPrefs() {
  const qc = useQueryClient()
  return useApiMutation((body: Partial<NotificationPrefs>) =>
    apiFetch("/me/notification-prefs", {
      method: "PATCH",
      body,
      schema: notificationPrefsSchema,
    }).then((p) => {
      qc.setQueryData(keys.prefs, p)
      return p
    })
  )
}
export const useSaveDraft = (key: string) =>
  useApiMutation(
    (data: Record<string, unknown>) =>
      apiFetch(`/drafts/${key}`, {
        method: "PATCH",
        body: { data },
        schema: draftSchema,
      }),
    [keys.drafts(key)]
  )
