import { useEffect, useState } from "react"

// True once `active` has held for `ms`. Skeletons use it so fast loads never flash (A1b G6).
export function useDelayed(active: boolean, ms = 150) {
  const [delayed, setDelayed] = useState(false)
  useEffect(() => {
    if (!active) return setDelayed(false)
    const id = window.setTimeout(() => setDelayed(true), ms)
    return () => window.clearTimeout(id)
  }, [active, ms])
  return delayed
}
