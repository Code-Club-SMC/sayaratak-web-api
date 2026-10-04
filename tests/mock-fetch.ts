import { vi } from "vitest"

import { handleMock } from "@/mocks/router"

// Routes `/api/*` calls into the mock handlers, so tests never hand-mock fetch. `as` signs requests in as a user id.
export function useMockFetch(as?: string) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" ? input : input.toString(),
      "http://localhost"
    )
    const headers = new Headers(init?.headers)
    if (as) headers.set("cookie", `sy_session=${as}`)
    return handleMock(new Request(url, { ...init, headers }))
  })
}
