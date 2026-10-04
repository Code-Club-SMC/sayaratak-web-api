import { useState } from "react"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { I18nextProvider } from "react-i18next"

import { NotFound } from "@/components/app/not-found"
import { DirectionProvider } from "@/components/ui/direction"
import { Toaster } from "@/components/ui/toast"
import { createI18n } from "@/lib/i18n/create"
import { getRootData } from "@/lib/i18n/server"
import { NowProvider } from "@/lib/now"
import { PrefsProvider } from "@/lib/prefs"
import { isRtl } from "@/lib/utils"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  // Locale is fixed for the life of a document (the language switch reloads the page), so load once.
  staleTime: Infinity,
  loader: ({ location }) =>
    getRootData({ data: { pathname: location.pathname } }),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Sayaratak",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale } = Route.useLoaderData()
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const { locale, messages, prefs, serverNow } = Route.useLoaderData()
  const [i18n] = useState(() => createI18n(locale, messages))
  return (
    <I18nextProvider i18n={i18n}>
      <DirectionProvider direction={isRtl(locale) ? "rtl" : "ltr"}>
        <PrefsProvider prefs={prefs}>
          <NowProvider serverNow={serverNow}>
            <Toaster>
              <Outlet />
            </Toaster>
          </NowProvider>
        </PrefsProvider>
      </DirectionProvider>
    </I18nextProvider>
  )
}
