import { queryOptions } from "@tanstack/react-query"

import type { Provider } from "@/features/auth/components/social-buttons"
import { authCall } from "@/lib/api/auth-error"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { authClient } from "@/lib/auth-client"

// Linked sign-in methods: "credential" (email + password) and social providers.
export const accountsQuery = queryOptions({
  queryKey: keys.accounts,
  queryFn: () => authCall(authClient.listAccounts()),
})

// Leaves for the provider and comes back to this page; Better-Auth adds `?error=` when it refuses (another email, already used).
export const useLinkSocial = () =>
  useApiMutation((provider: Provider) => {
    const url = new URL(window.location.href)
    url.searchParams.delete("error")
    return authCall(
      authClient.linkSocial({
        provider,
        callbackURL: url.href,
        errorCallbackURL: url.href,
      })
    )
  })

// `accountId` is the Better-Auth account row id from accountsQuery, not the provider's id.
export const useUnlinkSocial = () =>
  useApiMutation(
    (accountId: string) => authCall(authClient.unlinkAccount({ accountId })),
    [keys.me]
  )
