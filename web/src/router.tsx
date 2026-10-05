import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { sessionCaches } from "@/features/auth/session-ended"
import { NotFound } from "@/components/app/not-found"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { RouteError } from "@/components/app/route-error"
import { routeTree } from "./routeTree.gen"

// One QueryClient per router, and the router is created per request on the server, so nothing leaks between visitors.
export function getRouter() {
  const queryClient: QueryClient = new QueryClient({
    ...sessionCaches(() => queryClient),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  })
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouteError,
    defaultPendingComponent: PageSkeleton,
    // Skeletons appear only for loads slower than 150 ms (A1b G6).
    defaultPendingMs: 150,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
