import { vi } from "vitest"

import { handleMock } from "@/mocks/router"

// Routes `/api/*` calls into the mock handlers, so tests never hand-mock fetch.
export function useMockFetch() {
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" ? input : input.toString(),
      "http://localhost"
    )
    return handleMock(new Request(url, init))
  })
}
