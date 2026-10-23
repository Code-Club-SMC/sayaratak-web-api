import { lazy, Suspense, useEffect, useState } from "react"

import { useAuthGate } from "../auth-gate"

const load = () => import("./auth-dialog")
const AuthDialog = lazy(() => load().then((m) => ({ default: m.AuthDialog })))

// Mounted in the root: keeps the log in and sign up forms out of the first load. The dialog loads when the gate first opens, or once the browser is idle, and then stays mounted so it can animate out.
export function AuthDialogHost() {
  const { open } = useAuthGate()
  const [seen, setSeen] = useState(false)
  if (open && !seen) setSeen(true)
  useEffect(() => {
    const id = setTimeout(() => void load(), 3000)
    return () => clearTimeout(id)
  }, [])
  return seen ? (
    <Suspense fallback={null}>
      <AuthDialog />
    </Suspense>
  ) : null
}
