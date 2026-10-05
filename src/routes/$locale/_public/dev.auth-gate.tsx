import { useState } from "react"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { NotFound } from "@/components/app/not-found"
import { Button } from "@/components/ui/button"
import { meQuery } from "@/features/auth/me-query"
import { useRequireAuth } from "@/features/auth/auth-gate"

// Development-only demo for step 3.3, so the strings are plain English. Production returns 404. Remove in step 5.1, when real gated buttons exist.
export const Route = createFileRoute("/$locale/_public/dev/auth-gate")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: AuthGateDemo,
})

function AuthGateDemo() {
  const requireAuth = useRequireAuth()
  const { data: me } = useQuery(meQuery)
  const [runs, setRuns] = useState(0)
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-page font-semibold">Auth gate demo</h1>
      <p>Signed in as: {me ? me.fullName : "nobody"}</p>
      <Button onClick={() => requireAuth(() => setRuns((n) => n + 1))}>
        Run gated action
      </Button>
      <p>Gated action ran {runs} times</p>
    </div>
  )
}
