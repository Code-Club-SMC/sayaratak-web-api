import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"

import { keys } from "@/lib/api/query-keys"
import { createI18n } from "@/lib/i18n/create"
import { PrefsProvider, type Prefs } from "@/lib/prefs"
import type { Locale } from "@/schemas/locale"
import { userSchema, type User } from "@/schemas/user"
import { DirectionProvider } from "@/components/ui/direction"
import { db } from "@/mocks/db"
import ar from "@/messages/ar/common.json"
import en from "@/messages/en/common.json"
import arAuth from "@/messages/ar/auth.json"
import enAuth from "@/messages/en/auth.json"
import arError from "@/messages/ar/error.json"
import enError from "@/messages/en/error.json"
import arValidation from "@/messages/ar/validation.json"
import enValidation from "@/messages/en/validation.json"
import { useMockFetch } from "./mock-fetch"

export async function renderShell(
  ui: ReactNode,
  options: {
    locale?: Locale
    role?: User["role"]
    path?: string
    prefs?: Prefs
  } = {}
) {
  const {
    locale = "en",
    role,
    path = `/${locale}`,
    prefs = { dataSaver: false, listingView: "grid" },
  } = options
  const me = role
    ? userSchema.parse(
        db.users.find((user) => user.role === role && user.onboardingDone)
      )
    : null
  useMockFetch(me?.id)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(keys.me, me)
  const i18n = createI18n(locale, {
    common: locale === "ar" ? ar : en,
    auth: locale === "ar" ? arAuth : enAuth,
    error: locale === "ar" ? arError : enError,
    validation: locale === "ar" ? arValidation : enValidation,
  })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>
          <DirectionProvider direction={locale === "ar" ? "rtl" : "ltr"}>
            <PrefsProvider prefs={prefs}>{ui}</PrefsProvider>
          </DirectionProvider>
        </I18nextProvider>
      </QueryClientProvider>
    ),
  })
  const catchAll = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([catchAll]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const rendered = render(<RouterProvider router={router} />)
  return { ...rendered, client, router }
}
